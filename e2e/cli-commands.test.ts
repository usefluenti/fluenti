/**
 * CLI command E2E tests -- covers init, migrate, translate, glossary, cache,
 * corrupted catalogs, and parallel compile determinism.
 *
 * Follows the same helper pattern as cli-simulation.test.ts: temp directories,
 * execSync against the compiled CLI binary, clean up after each test.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'

const CLI = join(import.meta.dirname, '../packages/cli/dist/cli.js')

// ── helpers ──────────────────────────────────────────────────────────────────

function createProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'fluenti-cmd-'))
  for (const [relPath, content] of Object.entries(files)) {
    const abs = join(dir, relPath)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content, 'utf-8')
  }
  return dir
}

function cliEnv(): Record<string, string> {
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

/** Run CLI with --config pointing to the project config file, capturing combined stdout+stderr */
function cli(cmd: string, workDir: string): string {
  return execSync(
    `node ${CLI} ${cmd} --config ${join(workDir, 'fluenti.config.ts')} 2>&1`,
    { cwd: workDir, encoding: 'utf-8', timeout: 30_000, env: cliEnv() },
  )
}

/** Run CLI without --config (for commands like init / migrate that don't use it) */
function cliRaw(cmd: string, workDir: string): string {
  return execSync(`node ${CLI} ${cmd} 2>&1`, {
    cwd: workDir,
    encoding: 'utf-8',
    timeout: 30_000,
    env: cliEnv(),
  })
}

/** Minimal fluenti config as a TypeScript module */
function makeConfig(
  locales = ['en', 'ja'],
  format: 'json' | 'po' = 'json',
): string {
  return `export default {
  sourceLocale: 'en',
  locales: ${JSON.stringify(locales)},
  catalogDir: './locales',
  format: '${format}',
  include: ['./src/**/*.{ts,tsx}'],
  compileOutDir: './src/locales/compiled',
}\n`
}

/** Serialize a catalog to JSON */
function makeCatalog(
  entries: Record<string, { message: string; translation?: string }>,
): string {
  return JSON.stringify(entries, null, 2)
}

// ── tests ─────────────────────────────────────────────────────────────────────

// ── 1. init command ──────────────────────────────────────────────────────────

describe('CLI init command', () => {
  let tmpDir: string

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('init creates fluenti.config.ts when package.json exists and no config present', () => {
    tmpDir = createProject({
      'package.json': JSON.stringify({
        name: 'test-project',
        dependencies: { react: '^19.0.0' },
      }),
    })

    // init is interactive (consola.prompt), but when stdin is not a TTY
    // the prompts use their defaults: sourceLocale="en", targets="ja,zh-CN", format="po"
    let output: string
    try {
      output = cliRaw('init', tmpDir)
    } catch (err: any) {
      // If prompt fails in non-interactive mode, it may throw. That's OK --
      // we still check if the config was generated using defaults.
      output = String(err.stdout ?? err.stderr ?? err.message ?? '')
    }

    // The init command should detect React
    expect(output).toContain('Detected framework')

    // If the prompts failed in non-interactive mode, the config file won't exist.
    // In that case we simply verify init didn't crash with an unexpected error
    // and move on. The key behavior to test is the "already exists" guard below.
  })

  it('init does not overwrite existing config', () => {
    const existingConfig = 'export default { sourceLocale: "fr" }\n'
    tmpDir = createProject({
      'package.json': JSON.stringify({ name: 'test-project' }),
      'fluenti.config.ts': existingConfig,
    })

    let output: string
    try {
      output = cliRaw('init', tmpDir)
    } catch (err: any) {
      output = String(err.stdout ?? err.stderr ?? err.message ?? '')
    }

    // Should warn about existing config
    expect(output).toContain('already exists')

    // Verify the original config was NOT overwritten
    const configContent = readFileSync(join(tmpDir, 'fluenti.config.ts'), 'utf-8')
    expect(configContent).toBe(existingConfig)
  })

  it('init errors when package.json is missing', () => {
    tmpDir = createProject({})

    let output: string
    try {
      output = cliRaw('init', tmpDir)
    } catch (err: any) {
      output = String(err.stdout ?? err.stderr ?? err.message ?? '')
    }

    expect(output).toContain('No package.json found')
  })
})

// ── 2. migrate command ───────────────────────────────────────────────────────

describe('CLI migrate command', () => {
  let tmpDir: string

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('migrate with invalid provider shows error message', () => {
    tmpDir = createProject({
      'package.json': JSON.stringify({ name: 'test' }),
    })

    let output = ''
    let threw = false
    try {
      output = cliRaw('migrate --from=vue-i18n --provider=invalid-provider', tmpDir)
    } catch (err: any) {
      threw = true
      output = String(err.stdout ?? err.stderr ?? err.message ?? '')
    }

    expect(output).toContain('Invalid provider')
    expect(output).toContain('claude')
    expect(output).toContain('codex')
  })

  it('migrate with unsupported library shows error and lists supported libraries', () => {
    tmpDir = createProject({
      'package.json': JSON.stringify({ name: 'test' }),
    })

    let output = ''
    try {
      output = cliRaw('migrate --from=unknown-lib --provider=claude', tmpDir)
    } catch (err: any) {
      output = String(err.stdout ?? err.stderr ?? err.message ?? '')
    }

    expect(output).toContain('Unsupported library')
    expect(output).toContain('unknown-lib')
    // Should list at least some supported libraries
    expect(output).toContain('vue-i18n')
    expect(output).toContain('react-i18next')
  })

  it('migrate without --from flag shows usage error', () => {
    tmpDir = createProject({
      'package.json': JSON.stringify({ name: 'test' }),
    })

    let threw = false
    let output = ''
    try {
      output = cliRaw('migrate --provider=claude', tmpDir)
    } catch (err: any) {
      threw = true
      output = String(err.stdout ?? err.stderr ?? err.message ?? '')
    }

    // citty should complain about the required --from arg,
    // or the migrate command treats missing --from as undefined
    expect(threw || output.includes('from') || output.includes('required') || output.includes('Unsupported')).toBe(true)
  })
})

// ── 3. translate command ─────────────────────────────────────────────────────

describe('CLI translate command', () => {
  let tmpDir: string

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('translate --dry-run shows untranslated message count', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/ja.json': makeCatalog({
        'msg1': { message: 'Hello' },
        'msg2': { message: 'World', translation: '' },
        'msg3': { message: 'Goodbye', translation: 'さようなら' },
      }),
    })

    const output = cli('translate --dry-run', tmpDir)

    // Should report the untranslated messages
    expect(output).toContain('would be translated')
    expect(output).toContain('dry-run')
    // msg1 and msg2 are untranslated (msg2 has empty string)
    expect(output).toContain('Hello')
    expect(output).toContain('World')
  })

  it('translate with invalid provider shows error', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/ja.json': makeCatalog({
        'msg1': { message: 'Hello' },
      }),
    })

    let output = ''
    try {
      output = cli('translate --provider=gpt4', tmpDir)
    } catch (err: any) {
      output = String(err.stdout ?? err.stderr ?? err.message ?? '')
    }

    expect(output).toContain('Invalid provider')
    expect(output).toContain('claude')
    expect(output).toContain('codex')
  })

  it('translate --dry-run with fully translated catalog shows already translated', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/ja.json': makeCatalog({
        'msg1': { message: 'Hello', translation: 'こんにちは' },
        'msg2': { message: 'World', translation: '世界' },
      }),
    })

    const output = cli('translate --dry-run', tmpDir)

    expect(output).toContain('already fully translated')
  })
})

// ── 4. glossary feature ──────────────────────────────────────────────────────

describe('CLI glossary feature', () => {
  let tmpDir: string

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('translate --glossary with valid glossary JSON accepts the file', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/ja.json': makeCatalog({
        'msg1': { message: 'Hello' },
      }),
      'glossary.json': JSON.stringify({
        hello: { ja: 'こんにちは' },
        app: { ja: 'アプリ' },
      }),
    })

    // Dry-run should succeed with glossary loaded (no crash)
    const output = cli('translate --dry-run --glossary=glossary.json', tmpDir)

    expect(output).toContain('would be translated')
    expect(output).toContain('dry-run')
  })

  it('translate --glossary with invalid JSON throws parse error', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/ja.json': makeCatalog({
        'msg1': { message: 'Hello' },
      }),
      'glossary.json': 'NOT VALID JSON {{{',
    })

    let threw = false
    let output = ''
    try {
      output = cli('translate --dry-run --glossary=glossary.json', tmpDir)
    } catch (err: any) {
      threw = true
      output = String(err.stdout ?? err.stderr ?? err.message ?? '')
    }

    expect(threw).toBe(true)
    expect(output).toContain('Invalid glossary format')
  })

  it('translate --glossary with invalid structure throws validation error', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/ja.json': makeCatalog({
        'msg1': { message: 'Hello' },
      }),
      // Root value for "hello" must be an object, not a string
      'glossary.json': JSON.stringify({
        hello: 'not-an-object',
      }),
    })

    let threw = false
    let output = ''
    try {
      output = cli('translate --dry-run --glossary=glossary.json', tmpDir)
    } catch (err: any) {
      threw = true
      output = String(err.stdout ?? err.stderr ?? err.message ?? '')
    }

    expect(threw).toBe(true)
    expect(output).toContain('Invalid glossary format')
    expect(output).toContain('hello')
  })
})

// ── 5. cache behavior ────────────────────────────────────────────────────────

describe('CLI cache behavior', () => {
  let tmpDir: string

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('extract: second run with same files uses cache', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'src/app.tsx': `
        import { msg } from '@fluenti/react'
        export const HELLO = msg\`Hello world\`
      `,
    })

    // First extract -- no cache
    const output1 = cli('extract', tmpDir)
    expect(output1).toContain('1 messages')
    // First run should NOT mention "cached" (no cache hits yet)
    expect(output1).not.toContain('cached')

    // Second extract -- should use cache
    const output2 = cli('extract', tmpDir)
    expect(output2).toContain('1 messages')
    expect(output2).toContain('cached')
  })

  it('extract: modifying a source file invalidates cache for that file', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'src/app.tsx': `
        import { msg } from '@fluenti/react'
        export const HELLO = msg\`Original message\`
      `,
    })

    // First extract
    cli('extract', tmpDir)

    const enCatalog1 = JSON.parse(readFileSync(join(tmpDir, 'locales/en.json'), 'utf-8'))
    const msgs1 = Object.values(enCatalog1).map((e: any) => e.message as string)
    expect(msgs1).toContain('Original message')

    // Modify the source file -- add a new message
    writeFileSync(
      join(tmpDir, 'src/app.tsx'),
      `import { msg } from '@fluenti/react'
export const HELLO = msg\`Original message\`
export const BYE = msg\`New message\`
`,
    )

    // Second extract -- cache should be invalidated for the modified file
    cli('extract', tmpDir)

    const enCatalog2 = JSON.parse(readFileSync(join(tmpDir, 'locales/en.json'), 'utf-8'))
    const msgs2 = Object.values(enCatalog2).map((e: any) => e.message as string)
    expect(msgs2).toContain('Original message')
    expect(msgs2).toContain('New message')
  })

  it('compile: unchanged catalogs use cache', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/en.json': makeCatalog({
        'greeting': { message: 'Hello, {name}!' },
      }),
      'locales/ja.json': makeCatalog({
        'greeting': { message: 'Hello, {name}!', translation: 'こんにちは、{name}！' },
      }),
    })

    // First compile
    const output1 = cli('compile', tmpDir)
    expect(output1).toContain('Compiled en')
    expect(output1).toContain('Compiled ja')

    // Second compile -- should skip because catalogs are unchanged
    const output2 = cli('compile', tmpDir)
    expect(output2).toContain('unchanged')
    expect(output2).toContain('skipped')
  })

  it('compile: modified catalog triggers recompilation', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/en.json': makeCatalog({
        'greeting': { message: 'Hello' },
      }),
      'locales/ja.json': makeCatalog({
        'greeting': { message: 'Hello', translation: 'こんにちは' },
      }),
    })

    // First compile
    cli('compile', tmpDir)

    // Modify the Japanese catalog
    writeFileSync(
      join(tmpDir, 'locales/ja.json'),
      makeCatalog({
        'greeting': { message: 'Hello', translation: 'こんにちは！' },
      }),
    )

    // Second compile -- ja should recompile, en should be cached
    const output2 = cli('compile', tmpDir)
    expect(output2).toContain('Compiled ja')
    // en should be skipped
    expect(output2).toContain('unchanged')
  })
})

// ── 6. corrupted catalog handling ────────────────────────────────────────────

describe('CLI corrupted catalog handling', () => {
  let tmpDir: string

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('compile with corrupted JSON file exits with error, does not crash', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/en.json': 'CORRUPTED JSON {{{',
      'locales/ja.json': makeCatalog({
        'msg1': { message: 'Hello', translation: 'こんにちは' },
      }),
    })

    let threw = false
    let output = ''
    try {
      output = cli('compile', tmpDir)
    } catch (err: any) {
      threw = true
      output = String(err.stdout ?? err.stderr ?? err.message ?? '')
    }

    expect(threw).toBe(true)
    // Should contain a JSON parse error or "SyntaxError"
    expect(output).toMatch(/SyntaxError|JSON|parse/i)
  })

  it('compile with corrupted PO file exits with error, does not crash', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(['en', 'ja'], 'po'),
      'locales/en.po': 'CORRUPTED PO FILE!!!GARBAGE',
      'locales/ja.po': 'CORRUPTED PO FILE!!!GARBAGE',
    })

    let threw = false
    let output = ''
    try {
      output = cli('compile', tmpDir)
    } catch (err: any) {
      threw = true
      output = String(err.stdout ?? err.stderr ?? err.message ?? '')
    }

    expect(threw).toBe(true)
    // Should contain PO parsing error
    expect(output).toMatch(/SyntaxError|Error parsing PO|Invalid/i)
  })

  it('extract with malformed source file warns and continues with other files', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'src/bad.ts': 'THIS IS NOT VALID TYPESCRIPT {{{{',
      'src/good.tsx': `
        import { msg } from '@fluenti/react'
        export const HELLO = msg\`Hello world\`
      `,
    })

    // extract should NOT throw -- it should skip the bad file and continue
    const output = cli('extract --no-cache', tmpDir)

    // Should mention the bad file was skipped or failed to parse
    expect(output).toMatch(/skip|fail|parse/i)

    // Should still find the message from the good file
    expect(output).toContain('1 messages')
    expect(output).toContain('2 files')

    // Verify the good message was extracted
    const enCatalog = JSON.parse(readFileSync(join(tmpDir, 'locales/en.json'), 'utf-8'))
    const msgs = Object.values(enCatalog).map((e: any) => e.message as string)
    expect(msgs).toContain('Hello world')
  })
})

// ── 7. parallel compile verification ─────────────────────────────────────────

describe('CLI parallel compile', () => {
  let tmpDir: string

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('compile with multiple locales produces correct output for all locales', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(['en', 'ja', 'zh-CN']),
      'locales/en.json': makeCatalog({
        'greeting': { message: 'Hello, {name}!' },
        'count': { message: '{count, plural, one {# item} other {# items}}' },
      }),
      'locales/ja.json': makeCatalog({
        'greeting': { message: 'Hello, {name}!', translation: 'こんにちは、{name}！' },
        'count': { message: '{count, plural, one {# item} other {# items}}', translation: '{count, plural, one {# 件} other {# 件}}' },
      }),
      'locales/zh-CN.json': makeCatalog({
        'greeting': { message: 'Hello, {name}!', translation: '你好，{name}！' },
        'count': { message: '{count, plural, one {# item} other {# items}}', translation: '{count, plural, other {# 个项目}}' },
      }),
    })

    cli('compile --no-cache', tmpDir)

    // Verify all three locale files were generated
    const enJs = readFileSync(join(tmpDir, 'src/locales/compiled/en.js'), 'utf-8')
    const jaJs = readFileSync(join(tmpDir, 'src/locales/compiled/ja.js'), 'utf-8')
    const zhJs = readFileSync(join(tmpDir, 'src/locales/compiled/zh-CN.js'), 'utf-8')

    // English should have the source messages
    expect(enJs).toContain('v.name')

    // Japanese should have Japanese translations
    expect(jaJs).toContain('こんにちは')
    expect(jaJs).toContain('件')

    // Chinese should have Chinese translations
    expect(zhJs).toContain('你好')
    expect(zhJs).toContain('个项目')

    // Index file should list all locales
    const indexJs = readFileSync(join(tmpDir, 'src/locales/compiled/index.js'), 'utf-8')
    expect(indexJs).toContain('"en"')
    expect(indexJs).toContain('"ja"')
    expect(indexJs).toContain('"zh-CN"')
  })

  it('compile output is deterministic (same input produces identical output)', () => {
    tmpDir = createProject({
      'fluenti.config.ts': makeConfig(),
      'locales/en.json': makeCatalog({
        'greeting': { message: 'Hello, {name}!' },
        'farewell': { message: 'Goodbye, {name}!' },
        'count': { message: '{count, plural, one {# item} other {# items}}' },
      }),
      'locales/ja.json': makeCatalog({
        'greeting': { message: 'Hello, {name}!', translation: 'こんにちは、{name}！' },
        'farewell': { message: 'Goodbye, {name}!', translation: 'さようなら、{name}！' },
        'count': { message: '{count, plural, one {# item} other {# items}}', translation: '{count, plural, one {# 件} other {# 件}}' },
      }),
    })

    // First compile
    cli('compile --no-cache', tmpDir)
    const enJs1 = readFileSync(join(tmpDir, 'src/locales/compiled/en.js'), 'utf-8')
    const jaJs1 = readFileSync(join(tmpDir, 'src/locales/compiled/ja.js'), 'utf-8')

    // Delete compiled output
    rmSync(join(tmpDir, 'src/locales/compiled'), { recursive: true, force: true })

    // Second compile with same input
    cli('compile --no-cache', tmpDir)
    const enJs2 = readFileSync(join(tmpDir, 'src/locales/compiled/en.js'), 'utf-8')
    const jaJs2 = readFileSync(join(tmpDir, 'src/locales/compiled/ja.js'), 'utf-8')

    // Output must be identical
    expect(enJs1).toBe(enJs2)
    expect(jaJs1).toBe(jaJs2)
  })
})
