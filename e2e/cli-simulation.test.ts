/**
 * CLI simulation tests — developer workflow
 *
 * Simulates the real developer experience: create project → write code with
 * realistic i18n messages → run CLI commands → add translations → compile →
 * verify output is correct and executable. Also serves as E2E regression
 * coverage for Bugs 26-36 fixed in Wave 18-19.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'

const CLI = join(import.meta.dirname, '../packages/cli/dist/cli.js')

// ── helpers ──────────────────────────────────────────────────────────────────

function createProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'fluenti-sim-'))
  for (const [relPath, content] of Object.entries(files)) {
    const abs = join(dir, relPath)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content, 'utf-8')
  }
  return dir
}

function cliEnv(): Record<string, string> {
  // Strip Vitest-injected env vars so consola doesn't suppress output
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue
    if (key.startsWith('VITEST')) continue
    if (key === 'TEST') continue
    env[key] = value
  }
  env.FORCE_COLOR = '0'
  env.NODE_ENV = 'production'
  return env
}

function cli(cmd: string, workDir: string): string {
  return execSync(
    `node ${CLI} ${cmd} --config ${join(workDir, 'fluenti.config.ts')} 2>&1`,
    { cwd: workDir, encoding: 'utf-8', timeout: 30_000, env: cliEnv() },
  )
}

/** Minimal fluenti config as a TypeScript module */
function makeConfig(
  locales = ['en', 'ja'],
  format: 'json' | 'po' = 'json',
  includeVue = false,
): string {
  const include = includeVue
    ? `['./src/**/*.{ts,tsx,vue}']`
    : `['./src/**/*.{ts,tsx}']`
  return `export default {
  sourceLocale: 'en',
  locales: ${JSON.stringify(locales)},
  catalogDir: './locales',
  format: '${format}',
  include: ${include},
  compileOutDir: './src/locales/compiled',
}\n`
}

/** Serialize a catalog to JSON */
function makeCatalog(
  entries: Record<string, { message: string; translation?: string }>,
): string {
  return JSON.stringify(entries, null, 2)
}

/**
 * Find the first exported arrow-function expression in a compiled JS string.
 * Optionally filter to a line containing `containing`.
 */
function findExportedFn(js: string, containing?: string): string | null {
  for (const line of js.split('\n')) {
    const m = line.match(/^export const \w+ = (\(v\) => .+)/)
    if (m && (!containing || m[1]!.includes(containing))) return m[1]!
  }
  return null
}

/**
 * Evaluate an arrow-function expression and return the callable.
 * Uses `new Function` to avoid eval() — safe for trusted compiled output.
 */
function evalFn(expr: string): (v: Record<string, unknown>) => string {
  // `new Function('return ' + expr)()` creates and immediately calls a wrapper
  // that returns the arrow function.
  return new Function('return ' + expr)() as (v: Record<string, unknown>) => string
}

/** Collect all named export lines from compiled JS */
function findExports(js: string): string[] {
  return js.split('\n').filter(l => /^export const _\w+/.test(l))
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('CLI simulation — developer workflow', () => {
  let tmpDir: string

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  // ── 1. Developer onboarding: first time using Fluenti ─────────────────────

  it('developer onboarding: extract → add translations → compile', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(['en', 'ja']),
      'src/app.tsx': `
        import { msg } from '@fluenti/react'
        export const TITLE = msg\`Welcome to our app\`
        export const ROLE  = msg\`{role, select, admin {Admin} user {User} other {Guest}}\`
        export const CART  = msg\`{count, plural, one {# item} other {# items}}\`
        export const BYE   = msg\`Goodbye, {name}!\`
      `,
    })

    // Step 1: developer runs extract
    cli('extract', tmpDir)

    const enCatalog = JSON.parse(readFileSync(join(tmpDir, 'locales/en.json'), 'utf-8'))
    expect(Object.keys(enCatalog)).toHaveLength(4)
    const messages = Object.values(enCatalog).map((e: any) => e.message as string)
    expect(messages).toContain('Welcome to our app')
    expect(messages).toContain('Goodbye, {name}!')

    // Step 2: translator fills in ja.json
    const jaCatalog = JSON.parse(readFileSync(join(tmpDir, 'locales/ja.json'), 'utf-8')) as Record<
      string,
      { message: string; translation?: string }
    >
    for (const entry of Object.values(jaCatalog)) {
      if (entry.message === 'Welcome to our app') entry.translation = 'ようこそ'
      else if (entry.message === 'Goodbye, {name}!') entry.translation = 'さようなら、{name}！'
      else if (entry.message?.includes('count, plural'))
        entry.translation = '{count, plural, one {# 件} other {# 件}}'
      else if (entry.message?.includes('role, select'))
        entry.translation = '{role, select, admin {管理者} user {ユーザー} other {ゲスト}}'
    }
    writeFileSync(join(tmpDir, 'locales/ja.json'), JSON.stringify(jaCatalog, null, 2))

    // Step 3: compile
    cli('compile', tmpDir)

    const jaJs = readFileSync(join(tmpDir, 'src/locales/compiled/ja.js'), 'utf-8')
    expect(jaJs).toContain('ようこそ')
    expect(jaJs).toContain('管理者')

    // index.js lists both locales
    const indexJs = readFileSync(join(tmpDir, 'src/locales/compiled/index.js'), 'utf-8')
    expect(indexJs).toContain('"en"')
    expect(indexJs).toContain('"ja"')

    // type declarations are generated
    expect(() => readFileSync(join(tmpDir, 'src/locales/compiled/messages.d.ts'), 'utf-8')).not.toThrow()
  })

  // ── 2. Contraction/apostrophe (Bug 26 / 33 regression) ────────────────────

  it("contraction apostrophe: \"isn't {name}\" extracts correctly and compiles to valid JS (Bug 26/33)", () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'src/app.tsx': `
        import { msg } from '@fluenti/react'
        export const GREET   = msg\`isn't {name} a great app\`
        export const WELCOME = msg\`you're welcome, {name}\`
      `,
    })

    cli('extract', tmpDir)

    // Catalog must preserve apostrophe AND the {name} placeholder
    const enCatalog = JSON.parse(readFileSync(join(tmpDir, 'locales/en.json'), 'utf-8'))
    const messages = Object.values(enCatalog).map((e: any) => e.message as string)
    expect(messages).toContain("isn't {name} a great app")
    expect(messages).toContain("you're welcome, {name}")

    // Use source messages as Japanese translations (placeholder identity test)
    const jaCatalog = JSON.parse(readFileSync(join(tmpDir, 'locales/ja.json'), 'utf-8')) as Record<
      string,
      { message: string; translation?: string }
    >
    for (const entry of Object.values(jaCatalog)) entry.translation = entry.message
    writeFileSync(join(tmpDir, 'locales/ja.json'), JSON.stringify(jaCatalog, null, 2))

    cli('compile', tmpDir)

    const enJs = readFileSync(join(tmpDir, 'src/locales/compiled/en.js'), 'utf-8')

    // Compiled output must reference v.name (not swallow the placeholder)
    expect(enJs).toContain('v.name')

    // The compiled JS must be valid and executable
    const fnExpr = findExportedFn(enJs, "isn't")
    expect(fnExpr).not.toBeNull()
    const fn = evalFn(fnExpr!)
    const result = fn({ name: 'Alice' })
    expect(result).toContain('Alice')
    expect(result).toContain("isn't")
  })

  // ── 3. ICU plural — full developer workflow ───────────────────────────────

  it('ICU plural: extract → add Japanese translation → compile → runtime function works', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/en.json': makeCatalog({
        'cart-count': {
          message: '{count, plural, =0 {Empty cart} one {# item} other {# items}}',
        },
      }),
      'locales/ja.json': makeCatalog({
        'cart-count': {
          message: '{count, plural, =0 {Empty cart} one {# item} other {# items}}',
          translation: '{count, plural, =0 {カートは空} one {# 件} other {# 件}}',
        },
      }),
    })

    cli('compile', tmpDir)

    const enJs = readFileSync(join(tmpDir, 'src/locales/compiled/en.js'), 'utf-8')
    // ICU plural compiles to a function using Intl.PluralRules
    expect(enJs).toContain('Intl.PluralRules')

    // Runtime verification for English
    const enFn = evalFn(findExportedFn(enJs)!)
    expect(enFn({ count: 0 })).toBe('Empty cart')
    expect(enFn({ count: 1 })).toBe('1 item')
    expect(enFn({ count: 3 })).toBe('3 items')

    // Japanese compiled output has Japanese text and works at runtime
    const jaJs = readFileSync(join(tmpDir, 'src/locales/compiled/ja.js'), 'utf-8')
    expect(jaJs).toContain('カートは空')
    const jaFn = evalFn(findExportedFn(jaJs)!)
    expect(jaFn({ count: 0 })).toBe('カートは空')
    expect(jaFn({ count: 5 })).toBe('5 件')
  })

  // ── 4. ICU select — full developer workflow ───────────────────────────────

  it('ICU select: compile → select function works for all branches', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/en.json': makeCatalog({
        'role-select': {
          message: '{role, select, admin {Administrator} user {User} other {Guest}}',
        },
      }),
      'locales/ja.json': makeCatalog({
        'role-select': {
          message: '{role, select, admin {Administrator} user {User} other {Guest}}',
          translation: '{role, select, admin {管理者} user {ユーザー} other {ゲスト}}',
        },
      }),
    })

    cli('compile', tmpDir)

    const enJs = readFileSync(join(tmpDir, 'src/locales/compiled/en.js'), 'utf-8')
    // Select compiles to an IIFE: ((s) => { if (s === '...') return '...'; ... })(...)
    expect(enJs).toContain('((s) =>')

    const enFn = evalFn(findExportedFn(enJs)!)
    expect(enFn({ role: 'admin' })).toBe('Administrator')
    expect(enFn({ role: 'user' })).toBe('User')
    expect(enFn({ role: 'unknown' })).toBe('Guest')

    const jaJs = readFileSync(join(tmpDir, 'src/locales/compiled/ja.js'), 'utf-8')
    expect(jaJs).toContain('管理者')
    const jaFn = evalFn(findExportedFn(jaJs)!)
    expect(jaFn({ role: 'admin' })).toBe('管理者')
    expect(jaFn({ role: 'unknown' })).toBe('ゲスト')
  })

  // ── 5. Positional / numeric args (Bug 34 regression) ─────────────────────

  it("positional args {0}/{1}: compiled JS uses v['0'] not bare v.0 (Bug 34)", () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/en.json': makeCatalog({
        'pagination': { message: '{0} of {1} results' },
      }),
      'locales/ja.json': makeCatalog({
        'pagination': {
          message: '{0} of {1} results',
          translation: '{0} / {1} 件',
        },
      }),
    })

    cli('compile', tmpDir)

    const enJs = readFileSync(join(tmpDir, 'src/locales/compiled/en.js'), 'utf-8')

    // Must use quoted bracket notation — bare `v.0` is a JS SyntaxError
    expect(enJs).toContain("v['0']")
    expect(enJs).toContain("v['1']")

    // Runtime verification
    const fn = evalFn(findExportedFn(enJs)!)
    expect(fn({ '0': '5', '1': '100' })).toBe('5 of 100 results')

    const jaJs = readFileSync(join(tmpDir, 'src/locales/compiled/ja.js'), 'utf-8')
    expect(jaJs).toContain("v['0']")
    const jaFn = evalFn(findExportedFn(jaJs)!)
    expect(jaFn({ '0': '5', '1': '100' })).toBe('5 / 100 件')
  })

  // ── 6. Backtick in translation (Bug 35 regression) ────────────────────────

  it('backtick in translation body compiles to valid JS with escaped backtick (Bug 35)', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/en.json': makeCatalog({
        'plan-name': { message: 'The {name} plan' },
      }),
      'locales/ja.json': makeCatalog({
        // Literal backtick in the Japanese translation
        'plan-name': {
          message: 'The {name} plan',
          translation: '「`{name}`」プラン',
        },
      }),
    })

    cli('compile', tmpDir)

    const jaJs = readFileSync(join(tmpDir, 'src/locales/compiled/ja.js'), 'utf-8')

    // Backtick inside a template literal must be escaped as \`
    expect(jaJs).toContain('\\`')

    // The compiled JS must be syntactically valid and executable
    const fnExpr = findExportedFn(jaJs, 'プラン')
    expect(fnExpr).not.toBeNull()
    let fn: ((v: Record<string, unknown>) => string) | undefined
    expect(() => { fn = evalFn(fnExpr!) }).not.toThrow()
    const result = fn!({ name: 'premium' })
    expect(result).toContain('premium')
    // Literal backtick should appear in the rendered output
    expect(result).toContain('`')
  })

  // ── 7. lint: ICU select branch labels not reported as placeholders (Bug 36) ─

  it('lint: select branch labels not misreported as extra placeholders (Bug 36)', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/en.json': makeCatalog({
        'gender-msg': {
          message: '{gender, select, male {he} female {she} other {they}} arrived',
        },
      }),
      'locales/ja.json': makeCatalog({
        'gender-msg': {
          message: '{gender, select, male {he} female {she} other {they}} arrived',
          // Japanese select — branch bodies use Japanese, not {he}/{she}/{they}
          translation: '{gender, select, male {彼} female {彼女} other {彼ら}} が到着',
        },
      }),
    })

    // Before Bug 36 fix: lint would report he/she/they as missing placeholders
    // (regex-based extractPlaceholders treated {he}, {she}, {they} as variables)
    // After fix: only {gender} is extracted → translations are valid → lint exits 0
    let lintOutput = ''
    let threw = false
    try {
      lintOutput = cli('lint', tmpDir)
    } catch (err: any) {
      threw = true
      lintOutput = String(err.stdout ?? err.message ?? '')
    }

    expect(threw).toBe(false)
    // The branch body words must NOT appear as placeholder errors
    expect(lintOutput).not.toMatch(/\bhe\b.*placeholder/i)
    expect(lintOutput).not.toMatch(/\bshe\b.*placeholder/i)
    expect(lintOutput).not.toMatch(/\bthey\b.*placeholder/i)
  })

  // ── 8. Incremental extract preserves existing translations ─────────────────

  it('second extract run preserves existing translations and adds new messages', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'src/app.tsx': `
        import { msg } from '@fluenti/react'
        export const A = msg\`First message\`
      `,
    })

    // First extract
    cli('extract', tmpDir)

    // Translator adds Japanese translation
    const jaCatalog = JSON.parse(readFileSync(join(tmpDir, 'locales/ja.json'), 'utf-8')) as Record<
      string,
      { message: string; translation?: string }
    >
    for (const entry of Object.values(jaCatalog)) entry.translation = '最初のメッセージ'
    writeFileSync(join(tmpDir, 'locales/ja.json'), JSON.stringify(jaCatalog, null, 2))

    // Developer adds a second message to the source file
    writeFileSync(
      join(tmpDir, 'src/app.tsx'),
      `import { msg } from '@fluenti/react'
export const A = msg\`First message\`
export const B = msg\`Second message\`
`,
    )

    // Second extract
    cli('extract', tmpDir)

    const updatedJa = JSON.parse(readFileSync(join(tmpDir, 'locales/ja.json'), 'utf-8')) as Record<
      string,
      { message: string; translation?: string }
    >
    const entries = Object.values(updatedJa)

    // Existing translation must be preserved
    const firstEntry = entries.find(e => e.message === 'First message')
    expect(firstEntry?.translation).toBe('最初のメッセージ')

    // New message must have been added
    expect(entries.some(e => e.message === 'Second message')).toBe(true)
  })

  // ── 9. Multi-locale workflow (en + ja + zh-CN) ────────────────────────────

  it('multi-locale: three locales all compile correctly and appear in stats', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(['en', 'ja', 'zh-CN']),
      'locales/en.json': makeCatalog({
        'greeting': { message: 'Hello, {name}!' },
      }),
      'locales/ja.json': makeCatalog({
        'greeting': { message: 'Hello, {name}!', translation: 'こんにちは、{name}！' },
      }),
      'locales/zh-CN.json': makeCatalog({
        'greeting': { message: 'Hello, {name}!', translation: '你好，{name}！' },
      }),
    })

    cli('compile', tmpDir)

    const enJs = readFileSync(join(tmpDir, 'src/locales/compiled/en.js'), 'utf-8')
    const jaJs = readFileSync(join(tmpDir, 'src/locales/compiled/ja.js'), 'utf-8')
    const zhJs = readFileSync(join(tmpDir, 'src/locales/compiled/zh-CN.js'), 'utf-8')

    expect(enJs).toContain('v.name')
    expect(jaJs).toContain('こんにちは')
    expect(zhJs).toContain('你好')

    // Runtime verification across all three locales
    const enFn = evalFn(findExportedFn(enJs)!)
    const jaFn = evalFn(findExportedFn(jaJs)!)
    const zhFn = evalFn(findExportedFn(zhJs)!)
    expect(enFn({ name: 'World' })).toBe('Hello, World!')
    expect(jaFn({ name: '世界' })).toBe('こんにちは、世界！')
    expect(zhFn({ name: '世界' })).toBe('你好，世界！')

    // stats reports all three locales
    const statsOut = cli('stats', tmpDir)
    expect(statsOut).toContain('en')
    expect(statsOut).toContain('ja')
    expect(statsOut).toContain('zh-CN')
  })

  // ── 10. Comprehensive developer day — realistic app ───────────────────────

  it('comprehensive: realistic app with 5 message types — full extract → compile → check', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(['en', 'ja']),
      'src/app.tsx': `
        import { msg } from '@fluenti/react'
        // Plain text
        export const TITLE   = msg\`Welcome to our app\`
        // Apostrophe + variable
        export const GREET   = msg\`isn't {name} awesome\`
        // ICU plural
        export const CART    = msg\`{count, plural, =0 {Empty} one {# item} other {# items}}\`
        // ICU select
        export const ROLE    = msg\`{role, select, admin {Admin} user {User} other {Guest}}\`
        // Positional args
        export const PAGER   = msg\`{0} of {1}\`
      `,
    })

    // Extract all 5 messages
    cli('extract', tmpDir)

    const enCatalog = JSON.parse(readFileSync(join(tmpDir, 'locales/en.json'), 'utf-8'))
    expect(Object.keys(enCatalog)).toHaveLength(5)

    // Translator fills in ALL Japanese translations
    const jaCatalog = JSON.parse(readFileSync(join(tmpDir, 'locales/ja.json'), 'utf-8')) as Record<
      string,
      { message: string; translation?: string }
    >
    for (const entry of Object.values(jaCatalog)) {
      if (entry.message === 'Welcome to our app') {
        entry.translation = 'ようこそ'
      } else if (entry.message?.includes("isn't")) {
        entry.translation = '{name} は素晴らしい'
      } else if (entry.message?.includes('count, plural')) {
        entry.translation = '{count, plural, =0 {空} one {# 件} other {# 件}}'
      } else if (entry.message?.includes('role, select')) {
        entry.translation = '{role, select, admin {管理者} user {ユーザー} other {ゲスト}}'
      } else if (entry.message?.includes('{0}')) {
        entry.translation = '{0} / {1}'
      }
    }
    writeFileSync(join(tmpDir, 'locales/ja.json'), JSON.stringify(jaCatalog, null, 2))

    // Compile both locales
    cli('compile', tmpDir)

    const jaJs = readFileSync(join(tmpDir, 'src/locales/compiled/ja.js'), 'utf-8')

    // All 5 message exports are present in ja.js
    const exports = findExports(jaJs)
    expect(exports.length).toBeGreaterThanOrEqual(5)

    // Key translations appear in output
    expect(jaJs).toContain('ようこそ')
    expect(jaJs).toContain('管理者')

    // Positional args use quoted bracket notation
    expect(jaJs).toContain("v['0']")

    // check --min-coverage 100 passes because ALL ja messages are translated
    expect(() => cli('check --min-coverage 100', tmpDir)).not.toThrow()
  })

  // ── 11. Vue SFC: msg`` in <script setup> ─────────────────────────────────

  it('Vue SFC: msg`` in <script setup> extracts and compiles correctly', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(['en', 'ja'], 'json', true),
      'src/Home.vue': `
<script setup lang="ts">
import { msg } from '@fluenti/core'
const GREET = msg\`Hello from Vue, {name}!\`
const ROLE = msg\`{role, select, admin {Admin} user {User} other {Guest}}\`
</script>
<template><div>{{ GREET }}</div></template>
`,
    })

    // Step 1: extract recognises .vue files via vue-extractor
    cli('extract', tmpDir)

    const enCatalog = JSON.parse(readFileSync(join(tmpDir, 'locales/en.json'), 'utf-8'))
    const messages = Object.values(enCatalog).map((e: any) => e.message as string)
    expect(messages).toContain('Hello from Vue, {name}!')
    expect(messages.some(m => m.includes('role, select'))).toBe(true)

    // Step 2: add Japanese translations
    const jaCatalog = JSON.parse(readFileSync(join(tmpDir, 'locales/ja.json'), 'utf-8')) as Record<
      string,
      { message: string; translation?: string }
    >
    for (const entry of Object.values(jaCatalog)) {
      if (entry.message === 'Hello from Vue, {name}!') {
        entry.translation = 'こんにちは、{name}！'
      } else if (entry.message?.includes('role, select')) {
        entry.translation = '{role, select, admin {管理者} user {ユーザー} other {ゲスト}}'
      }
    }
    writeFileSync(join(tmpDir, 'locales/ja.json'), JSON.stringify(jaCatalog, null, 2))

    // Step 3: compile
    cli('compile', tmpDir)

    const jaJs = readFileSync(join(tmpDir, 'src/locales/compiled/ja.js'), 'utf-8')
    expect(jaJs).toContain('こんにちは')
    expect(jaJs).toContain('管理者')

    // Runtime verify greeting (template literal with variable)
    const greetFn = evalFn(findExportedFn(jaJs, 'こんにちは')!)
    expect(greetFn({ name: '世界' })).toBe('こんにちは、世界！')

    // Runtime verify role select
    const roleFn = evalFn(findExportedFn(jaJs, '管理者')!)
    expect(roleFn({ role: 'admin' })).toBe('管理者')
    expect(roleFn({ role: 'unknown' })).toBe('ゲスト')
  })

  // ── 12. PO format: professional localization workflow ─────────────────────

  it('PO format: extract to .po files, add translations, compile (gettext workflow)', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(['en', 'ja'], 'po'),
      'src/app.tsx': `
        import { msg } from '@fluenti/react'
        export const HELLO = msg\`Hello, {name}!\`
        export const CART  = msg\`{count, plural, one {# item} other {# items}}\`
      `,
    })

    // Step 1: extract produces .po files
    cli('extract', tmpDir)

    const enPo = readFileSync(join(tmpDir, 'locales/en.po'), 'utf-8')
    expect(enPo).toContain('msgid "Hello, {name}!"')
    expect(enPo).toContain('msgstr ""')

    const jaPo = readFileSync(join(tmpDir, 'locales/ja.po'), 'utf-8')
    expect(jaPo).toContain('msgid "Hello, {name}!"')

    // Step 2: translator fills in Japanese msgstr values
    const updatedJaPo = jaPo
      .replace(
        'msgid "Hello, {name}!"\nmsgstr ""',
        'msgid "Hello, {name}!"\nmsgstr "こんにちは、{name}！"',
      )
      .replace(
        /msgid "\{count, plural, one \{# item\} other \{# items\}\}"\nmsgstr ""/,
        'msgid "{count, plural, one {# item} other {# items}}"\nmsgstr "{count, plural, one {# 件} other {# 件}}"',
      )
    writeFileSync(join(tmpDir, 'locales/ja.po'), updatedJaPo, 'utf-8')

    // Step 3: compile reads PO translations
    cli('compile', tmpDir)

    const jaJs = readFileSync(join(tmpDir, 'src/locales/compiled/ja.js'), 'utf-8')
    expect(jaJs).toContain('こんにちは')

    // Runtime verify greeting
    const helloFn = evalFn(findExportedFn(jaJs, 'こんにちは')!)
    expect(helloFn({ name: 'Alice' })).toBe('こんにちは、Alice！')

    // lint: correct PO translations must not generate any errors
    let threw = false
    try {
      cli('lint', tmpDir)
    } catch {
      threw = true
    }
    expect(threw).toBe(false)
  })

  // ── 13. extract --clean: remove obsolete messages ─────────────────────────

  it('extract --clean removes obsolete entries while preserving active translations', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'src/app.tsx': `
        import { msg } from '@fluenti/react'
        export const A = msg\`Keep this message\`
        export const B = msg\`Delete this message\`
      `,
    })

    // Step 1: first extract — both messages in catalog
    cli('extract', tmpDir)

    const enAfterFirst = JSON.parse(readFileSync(join(tmpDir, 'locales/en.json'), 'utf-8'))
    const firstMsgs = Object.values(enAfterFirst).map((e: any) => e.message as string)
    expect(firstMsgs).toContain('Keep this message')
    expect(firstMsgs).toContain('Delete this message')

    // Step 2: translator adds Japanese translations for both
    const jaCatalog = JSON.parse(readFileSync(join(tmpDir, 'locales/ja.json'), 'utf-8')) as Record<
      string,
      { message: string; translation?: string }
    >
    for (const entry of Object.values(jaCatalog)) {
      if (entry.message === 'Keep this message') entry.translation = '残すメッセージ'
      else if (entry.message === 'Delete this message') entry.translation = '削除するメッセージ'
    }
    writeFileSync(join(tmpDir, 'locales/ja.json'), JSON.stringify(jaCatalog, null, 2))

    // Step 3: developer removes "Delete this message" from source
    writeFileSync(
      join(tmpDir, 'src/app.tsx'),
      `import { msg } from '@fluenti/react'
export const A = msg\`Keep this message\`
`,
    )

    // Step 4: extract without --clean → "Delete this message" is marked obsolete
    cli('extract', tmpDir)

    const enAfterSecond = JSON.parse(readFileSync(join(tmpDir, 'locales/en.json'), 'utf-8'))
    const deletedEntry = Object.values(enAfterSecond).find(
      (e: any) => e.message === 'Delete this message',
    ) as any
    expect(deletedEntry).toBeDefined()
    expect(deletedEntry.obsolete).toBe(true)

    // Step 5: extract --clean → obsolete entries purged
    cli('extract --clean', tmpDir)

    const enAfterClean = JSON.parse(readFileSync(join(tmpDir, 'locales/en.json'), 'utf-8'))
    const remainingMsgs = Object.values(enAfterClean).map((e: any) => e.message as string)
    expect(remainingMsgs).toContain('Keep this message')
    expect(remainingMsgs).not.toContain('Delete this message')

    // Active translation for "Keep this message" is preserved in ja.json
    const jaAfterClean = JSON.parse(readFileSync(join(tmpDir, 'locales/ja.json'), 'utf-8'))
    const keepEntry = Object.values(jaAfterClean).find(
      (e: any) => e.message === 'Keep this message',
    ) as any
    expect(keepEntry?.translation).toBe('残すメッセージ')
  })
})
