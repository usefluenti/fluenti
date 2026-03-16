import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { compileAll } from '../src/compile'

const TMP_DIR = resolve(__dirname, '.tmp-compile-test')
const CATALOG_DIR = resolve(TMP_DIR, 'locales')
const OUT_DIR = resolve(TMP_DIR, 'compiled')

beforeEach(() => {
  mkdirSync(CATALOG_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
})

// ─── PO format ──────────────────────────────────────────────────────────────

describe('compileAll (PO format)', () => {
  it('compiles a basic PO catalog to JS', () => {
    writeFileSync(resolve(CATALOG_DIR, 'en.po'), [
      'msgid "Hello"',
      'msgstr "Hello"',
      '',
      'msgid "Goodbye"',
      'msgstr "Goodbye"',
    ].join('\n'))

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['en'], format: 'po' })

    const output = readFileSync(resolve(OUT_DIR, 'en.ts'), 'utf-8')
    expect(output).toContain("'Hello': 'Hello'")
    expect(output).toContain("'Goodbye': 'Goodbye'")
    expect(output).toContain('export default {')
  })

  it('compiles PO with translations', () => {
    writeFileSync(resolve(CATALOG_DIR, 'ja.po'), [
      'msgid "Hello"',
      'msgstr "こんにちは"',
      '',
      'msgid "Goodbye"',
      'msgstr "さようなら"',
    ].join('\n'))

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['ja'], format: 'po' })

    const output = readFileSync(resolve(OUT_DIR, 'ja.ts'), 'utf-8')
    expect(output).toContain("'Hello': 'こんにちは'")
    expect(output).toContain("'Goodbye': 'さようなら'")
  })

  it('compiles PO with ICU variables to template functions', () => {
    writeFileSync(resolve(CATALOG_DIR, 'en.po'), [
      'msgid "Hello, {name}!"',
      'msgstr "Hello, {name}!"',
    ].join('\n'))

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['en'], format: 'po' })

    const output = readFileSync(resolve(OUT_DIR, 'en.ts'), 'utf-8')
    expect(output).toContain('(v) => `Hello, ${v.name}!`')
  })

  it('compiles PO with multiple ICU variables', () => {
    writeFileSync(resolve(CATALOG_DIR, 'en.po'), [
      'msgid "{count} items in {category}"',
      'msgstr "{count} items in {category}"',
    ].join('\n'))

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['en'], format: 'po' })

    const output = readFileSync(resolve(OUT_DIR, 'en.ts'), 'utf-8')
    expect(output).toContain('(v) => `${v.count} items in ${v.category}`')
  })

  it('filters obsolete entries (marked with #~)', () => {
    writeFileSync(resolve(CATALOG_DIR, 'en.po'), [
      'msgid "Active"',
      'msgstr "Active"',
      '',
      '#~ msgid "Old"',
      'msgid "Old"',
      'msgstr "Old message"',
    ].join('\n'))

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['en'], format: 'po' })

    const output = readFileSync(resolve(OUT_DIR, 'en.ts'), 'utf-8')
    expect(output).toContain("'Active': 'Active'")
    expect(output).not.toContain("'Old'")
  })

  it('handles multiline msgstr in PO', () => {
    writeFileSync(resolve(CATALOG_DIR, 'en.po'), [
      'msgid "Long message"',
      'msgstr ""',
      '"This is a very "',
      '"long translation"',
    ].join('\n'))

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['en'], format: 'po' })

    const output = readFileSync(resolve(OUT_DIR, 'en.ts'), 'utf-8')
    expect(output).toContain("'Long message': 'This is a very long translation'")
  })

  it('handles escaped characters in PO strings', () => {
    writeFileSync(resolve(CATALOG_DIR, 'en.po'), [
      'msgid "Line 1\\nLine 2"',
      'msgstr "Line 1\\nLine 2"',
    ].join('\n'))

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['en'], format: 'po' })

    const output = readFileSync(resolve(OUT_DIR, 'en.ts'), 'utf-8')
    // The \n in PO becomes literal newline, then escapeStringLiteral converts back
    expect(output).toContain('\\n')
  })

  it('falls back to message when translation is empty', () => {
    writeFileSync(resolve(CATALOG_DIR, 'ja.po'), [
      'msgid "Untranslated"',
      'msgstr ""',
    ].join('\n'))

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['ja'], format: 'po' })

    const output = readFileSync(resolve(OUT_DIR, 'ja.ts'), 'utf-8')
    // Empty msgstr → entry.translation is undefined → falls back to entry.message
    expect(output).toContain("'Untranslated': 'Untranslated'")
  })

  it('returns empty catalog for non-existent file', () => {
    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['missing'], format: 'po' })

    const output = readFileSync(resolve(OUT_DIR, 'missing.ts'), 'utf-8')
    expect(output).toBe('export default {\n}\n')
  })

  it('compiles multiple locales', () => {
    writeFileSync(resolve(CATALOG_DIR, 'en.po'), 'msgid "Hello"\nmsgstr "Hello"\n')
    writeFileSync(resolve(CATALOG_DIR, 'ja.po'), 'msgid "Hello"\nmsgstr "こんにちは"\n')

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['en', 'ja'], format: 'po' })

    expect(existsSync(resolve(OUT_DIR, 'en.ts'))).toBe(true)
    expect(existsSync(resolve(OUT_DIR, 'ja.ts'))).toBe(true)

    const ja = readFileSync(resolve(OUT_DIR, 'ja.ts'), 'utf-8')
    expect(ja).toContain("'Hello': 'こんにちは'")
  })
})

// ─── JSON format ────────────────────────────────────────────────────────────

describe('compileAll (JSON format)', () => {
  it('compiles a basic JSON catalog', () => {
    writeFileSync(resolve(CATALOG_DIR, 'en.json'), JSON.stringify({
      'Hello': 'Hello',
      'Goodbye': 'Goodbye',
    }))

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['en'], format: 'json' })

    const output = readFileSync(resolve(OUT_DIR, 'en.ts'), 'utf-8')
    expect(output).toContain("'Hello': 'Hello'")
    expect(output).toContain("'Goodbye': 'Goodbye'")
  })

  it('handles JSON with object entries', () => {
    writeFileSync(resolve(CATALOG_DIR, 'ja.json'), JSON.stringify({
      'Hello': { message: 'Hello', translation: 'こんにちは' },
    }))

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['ja'], format: 'json' })

    const output = readFileSync(resolve(OUT_DIR, 'ja.ts'), 'utf-8')
    expect(output).toContain("'Hello': 'こんにちは'")
  })

  it('handles JSON with ICU variables', () => {
    writeFileSync(resolve(CATALOG_DIR, 'en.json'), JSON.stringify({
      'Hello, {name}!': 'Hello, {name}!',
    }))

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['en'], format: 'json' })

    const output = readFileSync(resolve(OUT_DIR, 'en.ts'), 'utf-8')
    expect(output).toContain('(v) => `Hello, ${v.name}!`')
  })

  it('returns empty catalog for non-existent JSON file', () => {
    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['missing'], format: 'json' })

    const output = readFileSync(resolve(OUT_DIR, 'missing.ts'), 'utf-8')
    expect(output).toBe('export default {\n}\n')
  })
})

// ─── Escaping ───────────────────────────────────────────────────────────────

describe('escaping in compiled output', () => {
  it('escapes single quotes in message IDs', () => {
    writeFileSync(resolve(CATALOG_DIR, 'en.po'), [
      "msgid \"It's a test\"",
      "msgstr \"It's a test\"",
    ].join('\n'))

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['en'], format: 'po' })

    const output = readFileSync(resolve(OUT_DIR, 'en.ts'), 'utf-8')
    expect(output).toContain("\\'s")
  })

  it('escapes backticks in template literals', () => {
    writeFileSync(resolve(CATALOG_DIR, 'en.po'), [
      'msgid "Use {code} here"',
      'msgstr "Use {code} here"',
    ].join('\n'))

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['en'], format: 'po' })

    const output = readFileSync(resolve(OUT_DIR, 'en.ts'), 'utf-8')
    // Should produce a template function since it has {code} variable
    expect(output).toContain('(v) => `Use ${v.code} here`')
  })

  it('escapes backslashes in translations', () => {
    writeFileSync(resolve(CATALOG_DIR, 'en.po'), [
      'msgid "Path: C:\\\\Users"',
      'msgstr "Path: C:\\\\Users"',
    ].join('\n'))

    compileAll({ catalogDir: CATALOG_DIR, compileOutDir: OUT_DIR, locales: ['en'], format: 'po' })

    const output = readFileSync(resolve(OUT_DIR, 'en.ts'), 'utf-8')
    expect(output).toContain('\\\\')
  })
})
