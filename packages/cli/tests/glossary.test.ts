import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  loadGlossary,
  getGlossaryForLocale,
  buildGlossaryPromptSection,
} from '../src/glossary'
import type { GlossaryData } from '../src/glossary'

describe('loadGlossary', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'glossary-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns parsed GlossaryData from a valid JSON file', () => {
    const data: GlossaryData = {
      workspace: { ja: 'ワークスペース', 'zh-CN': '工作区' },
      dashboard: { ja: 'ダッシュボード' },
    }
    const filePath = join(tempDir, 'glossary.json')
    writeFileSync(filePath, JSON.stringify(data))

    expect(loadGlossary(filePath)).toEqual(data)
  })

  it('returns {} for a non-existent file', () => {
    expect(loadGlossary(join(tempDir, 'missing.json'))).toEqual({})
  })

  it('throws with parse error for invalid JSON', () => {
    const filePath = join(tempDir, 'bad.json')
    writeFileSync(filePath, '{ not valid json }')

    expect(() => loadGlossary(filePath)).toThrow('Invalid glossary format: failed to parse JSON')
  })

  it('throws with format error when root is not an object', () => {
    const filePath = join(tempDir, 'array.json')
    writeFileSync(filePath, '["a", "b"]')

    expect(() => loadGlossary(filePath)).toThrow('Invalid glossary format: root must be a plain object')
  })

  it('throws with format error when a term value is not an object', () => {
    const filePath = join(tempDir, 'bad-value.json')
    writeFileSync(filePath, JSON.stringify({ workspace: 'not-an-object' }))

    expect(() => loadGlossary(filePath)).toThrow(
      'Invalid glossary format: value for "workspace" must be a plain object',
    )
  })

  it('throws with format error when a translation is not a string', () => {
    const filePath = join(tempDir, 'bad-translation.json')
    writeFileSync(filePath, JSON.stringify({ workspace: { ja: 123 } }))

    expect(() => loadGlossary(filePath)).toThrow(
      'Invalid glossary format: "workspace.ja" must be a string, got number',
    )
  })

  it('returns {} for an empty object', () => {
    const filePath = join(tempDir, 'empty.json')
    writeFileSync(filePath, '{}')

    expect(loadGlossary(filePath)).toEqual({})
  })
})

describe('getGlossaryForLocale', () => {
  it('filters terms to the target locale', () => {
    const glossary: GlossaryData = {
      workspace: { ja: 'ワークスペース', 'zh-CN': '工作区' },
    }

    expect(getGlossaryForLocale(glossary, 'ja')).toEqual({
      workspace: 'ワークスペース',
    })
  })

  it('returns {} when no terms match the locale', () => {
    const glossary: GlossaryData = {
      workspace: { ja: 'ワークスペース' },
    }

    expect(getGlossaryForLocale(glossary, 'fr')).toEqual({})
  })

  it('returns only matching terms for partial matches', () => {
    const glossary: GlossaryData = {
      workspace: { ja: 'ワークスペース', 'zh-CN': '工作区' },
      dashboard: { 'zh-CN': '仪表盘' },
      settings: { ja: '設定' },
    }

    expect(getGlossaryForLocale(glossary, 'zh-CN')).toEqual({
      workspace: '工作区',
      dashboard: '仪表盘',
    })
  })

  it('returns {} for an empty glossary', () => {
    expect(getGlossaryForLocale({}, 'ja')).toEqual({})
  })
})

describe('buildGlossaryPromptSection', () => {
  it('returns formatted section with header and term lines', () => {
    const terms = { workspace: 'ワークスペース', dashboard: 'ダッシュボード' }
    const result = buildGlossaryPromptSection(terms)

    expect(result).toBe(
      '=== GLOSSARY (use these exact translations) ===\n' +
        '"dashboard" → "ダッシュボード"\n' +
        '"workspace" → "ワークスペース"',
    )
  })

  it('returns empty string for empty terms', () => {
    expect(buildGlossaryPromptSection({})).toBe('')
  })

  it('sorts terms alphabetically', () => {
    const terms = { zebra: 'シマウマ', apple: 'リンゴ', mango: 'マンゴー' }
    const result = buildGlossaryPromptSection(terms)
    const lines = result.split('\n').slice(1) // skip header

    expect(lines).toEqual([
      '"apple" → "リンゴ"',
      '"mango" → "マンゴー"',
      '"zebra" → "シマウマ"',
    ])
  })

  it('handles multiple terms with correct formatting', () => {
    const terms = { a: '1', b: '2', c: '3' }
    const result = buildGlossaryPromptSection(terms)
    const lines = result.split('\n')

    expect(lines).toHaveLength(4) // 1 header + 3 terms
    expect(lines[0]).toBe('=== GLOSSARY (use these exact translations) ===')
  })
})
