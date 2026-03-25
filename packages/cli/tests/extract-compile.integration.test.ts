import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { runExtract } from '../src/extract-runner'
import { runCompile } from '../src/compile-runner'

// ── helpers ─────────────────────────────────────────────────────────────────

function createTmpProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'fluenti-integ-'))
  for (const [relPath, content] of Object.entries(files)) {
    const absPath = join(dir, relPath)
    mkdirSync(dirname(absPath), { recursive: true })
    writeFileSync(absPath, content, 'utf-8')
  }
  return dir
}

/** Minimal fluenti config (explicit ESM, no external imports needed) */
const CONFIG_MJS = `
export default {
  sourceLocale: 'en',
  locales: ['en', 'ja'],
  catalogDir: './locales',
  format: 'po',
  include: ['./src/**/*.{tsx,ts,vue}'],
  compileOutDir: './src/locales/compiled',
}
`

/** A PO file with one translated entry */
function poWithTranslation(msgid: string, msgstr: string): string {
  return [
    'msgid ""',
    'msgstr "Content-Type: text/plain; charset=utf-8\\n"',
    '',
    `msgid "${msgid}"`,
    `msgstr "${msgstr}"`,
    '',
  ].join('\n')
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('extract + compile pipeline (integration)', () => {
  let tmpDir: string

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  // ── 1. runExtract: TSX ──────────────────────────────────────────────────

  it('extracts msg`` from TSX source files into PO catalogs', async () => {
    tmpDir = createTmpProject({
      'fluenti.config.mjs': CONFIG_MJS,
      'src/App.tsx': `
        import { msg } from '@fluenti/react'
        const ROLES = {
          admin: msg\`Administrator\`,
          user: msg\`Regular User\`,
        }
      `,
    })

    await runExtract(tmpDir)

    const enPo = readFileSync(join(tmpDir, 'locales/en.po'), 'utf-8')
    expect(enPo).toContain('msgid "Administrator"')
    expect(enPo).toContain('msgid "Regular User"')

    // ja.po is created for every locale, with empty translations
    const jaPo = readFileSync(join(tmpDir, 'locales/ja.po'), 'utf-8')
    expect(jaPo).toContain('msgid "Administrator"')
    expect(jaPo).toContain('msgid "Regular User"')
  })

  // ── 2. runExtract: Vue SFC ──────────────────────────────────────────────

  it('extracts msg`` from Vue SFC script blocks into PO catalogs', async () => {
    tmpDir = createTmpProject({
      'fluenti.config.mjs': CONFIG_MJS,
      'src/Home.vue': `
        <script setup lang="ts">
        import { msg } from '@fluenti/core'
        const ROLES = {
          admin: msg\`Administrator\`,
          user: msg\`Regular User\`,
        }
        </script>
        <template><div>{{ ROLES.admin }}</div></template>
      `,
    })

    await runExtract(tmpDir)

    const enPo = readFileSync(join(tmpDir, 'locales/en.po'), 'utf-8')
    expect(enPo).toContain('msgid "Administrator"')
    expect(enPo).toContain('msgid "Regular User"')
  })

  // ── 3. runCompile: PO → compiled JS ────────────────────────────────────

  it('compiles PO catalogs to hash-based JS exports with correct translations', async () => {
    tmpDir = createTmpProject({
      'fluenti.config.mjs': CONFIG_MJS,
      'locales/en.po': poWithTranslation('Administrator', 'Administrator'),
      'locales/ja.po': poWithTranslation('Administrator', '管理者'),
    })

    await runCompile(tmpDir)

    // runCompile auto-creates compileOutDir
    const enJs = readFileSync(join(tmpDir, 'src/locales/compiled/en.js'), 'utf-8')
    expect(enJs).toContain("= 'Administrator'")
    // Must use hash-based export names (export const _<hash> = ...)
    expect(enJs).toMatch(/export const _[a-z0-9]+ = 'Administrator'/)

    const jaJs = readFileSync(join(tmpDir, 'src/locales/compiled/ja.js'), 'utf-8')
    expect(jaJs).toContain("= '管理者'")

    // Registry and type declaration are generated
    expect(existsSync(join(tmpDir, 'src/locales/compiled/index.js'))).toBe(true)
    expect(existsSync(join(tmpDir, 'src/locales/compiled/messages.d.ts'))).toBe(true)
  })

  // ── 4. full pipeline: extract → compile ────────────────────────────────

  it('end-to-end: msg`` extract then compile produces correct translated output', async () => {
    tmpDir = createTmpProject({
      'fluenti.config.mjs': CONFIG_MJS,
      'src/App.tsx': `
        import { msg } from '@fluenti/react'
        const ROLES = { admin: msg\`Administrator\` }
      `,
    })

    await runExtract(tmpDir)

    // Simulate a translator filling in the Japanese PO entry
    const jaPo = readFileSync(join(tmpDir, 'locales/ja.po'), 'utf-8')
    writeFileSync(
      join(tmpDir, 'locales/ja.po'),
      jaPo.replace(
        'msgid "Administrator"\nmsgstr ""',
        'msgid "Administrator"\nmsgstr "管理者"',
      ),
      'utf-8',
    )

    await runCompile(tmpDir)

    const enJs = readFileSync(join(tmpDir, 'src/locales/compiled/en.js'), 'utf-8')
    expect(enJs).toContain("= 'Administrator'")

    const jaJs = readFileSync(join(tmpDir, 'src/locales/compiled/ja.js'), 'utf-8')
    expect(jaJs).toContain("= '管理者'")
  })

  // ── 5. runCompile alone does NOT extract ───────────────────────────────

  it('runCompile does not extract new messages from source files (compile-only)', async () => {
    tmpDir = createTmpProject({
      'fluenti.config.mjs': CONFIG_MJS,
      'locales/en.po': poWithTranslation('Administrator', 'Administrator'),
      'locales/ja.po': poWithTranslation('Administrator', '管理者'),
      // A source file with a NEW message that only extract would pick up
      'src/NewPage.tsx': `
        import { msg } from '@fluenti/react'
        const MSGS = { newMsg: msg\`Brand New Message\` }
      `,
    })

    const enPoMtimeBefore = statSync(join(tmpDir, 'locales/en.po')).mtimeMs

    await runCompile(tmpDir)

    // PO files are not modified by compile
    expect(statSync(join(tmpDir, 'locales/en.po')).mtimeMs).toBe(enPoMtimeBefore)

    // "Brand New Message" was NOT extracted — it should not appear in the compiled output
    const enJs = readFileSync(join(tmpDir, 'src/locales/compiled/en.js'), 'utf-8')
    expect(enJs).not.toContain('Brand New Message')

    // The pre-existing Administrator entry was compiled correctly
    expect(enJs).toContain("= 'Administrator'")
  })
})
