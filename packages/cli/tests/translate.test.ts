import { describe, it, expect, vi } from 'vitest'
import { getUntranslatedEntries, chunkEntries, translateCatalog } from '../src/translate'
import type { CatalogData } from '../src/catalog'

// Mock ai-provider to control invokeAI in translate tests
vi.mock('../src/ai-provider', () => ({
  invokeAI: vi.fn(),
}))

import { invokeAI } from '../src/ai-provider'

describe('getUntranslatedEntries', () => {
  it('returns entries without translation', () => {
    const catalog: CatalogData = {
      abc: { message: 'Hello' },
      def: { message: 'World', translation: 'Monde' },
    }

    const result = getUntranslatedEntries(catalog)

    expect(result).toEqual({ abc: 'Hello' })
  })

  it('returns entries with empty string translation', () => {
    const catalog: CatalogData = {
      abc: { message: 'Hello', translation: '' },
    }

    const result = getUntranslatedEntries(catalog)

    expect(result).toEqual({ abc: 'Hello' })
  })

  it('skips obsolete entries', () => {
    const catalog: CatalogData = {
      abc: { message: 'Hello', obsolete: true },
      def: { message: 'World' },
    }

    const result = getUntranslatedEntries(catalog)

    expect(result).toEqual({ def: 'World' })
  })

  it('returns empty object when all are translated', () => {
    const catalog: CatalogData = {
      abc: { message: 'Hello', translation: 'Bonjour' },
    }

    const result = getUntranslatedEntries(catalog)

    expect(result).toEqual({})
  })

  it('uses id as fallback when message is undefined', () => {
    const catalog: CatalogData = {
      greeting: {},
    }

    const result = getUntranslatedEntries(catalog)

    expect(result).toEqual({ greeting: 'greeting' })
  })
})

describe('chunkEntries', () => {
  it('returns single chunk when entries fit in batch size', () => {
    const entries = { a: '1', b: '2', c: '3' }
    const result = chunkEntries(entries, 5)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(entries)
  })

  it('splits entries into correct number of chunks', () => {
    const entries = { a: '1', b: '2', c: '3', d: '4', e: '5' }
    const result = chunkEntries(entries, 2)

    expect(result).toHaveLength(3)
    expect(Object.keys(result[0]!)).toHaveLength(2)
    expect(Object.keys(result[1]!)).toHaveLength(2)
    expect(Object.keys(result[2]!)).toHaveLength(1)
  })

  it('returns empty array for empty entries', () => {
    const result = chunkEntries({}, 5)

    expect(result).toEqual([])
  })

  it('preserves all key-value pairs across chunks', () => {
    const entries = { a: '1', b: '2', c: '3' }
    const result = chunkEntries(entries, 2)

    const merged = Object.assign({}, ...result)
    expect(merged).toEqual(entries)
  })
})

describe('translateCatalog', () => {
  it('does not mutate the original catalog', async () => {
    // Mock invokeAI by mocking the module
    const translateModule = await import('../src/translate')

    // We can't easily mock invokeAI since it's not exported,
    // but we can test with no untranslated entries to verify immutability
    const allTranslated: CatalogData = {
      abc: { message: 'Hello', translation: 'Bonjour' },
      def: { message: 'World', translation: 'Monde' },
    }

    const { catalog, warnings } = await translateModule.translateCatalog({
      provider: 'claude',
      sourceLocale: 'en',
      targetLocale: 'fr',
      catalog: allTranslated,
      batchSize: 10,
    })

    // Original should not be mutated
    expect(allTranslated).toEqual({
      abc: { message: 'Hello', translation: 'Bonjour' },
      def: { message: 'World', translation: 'Monde' },
    })

    // Returned catalog should be a different object
    expect(catalog).not.toBe(allTranslated)
    expect(catalog).toEqual(allTranslated)
    expect(warnings).toEqual([])
  })

  it('returns translated count of 0 when nothing to translate', async () => {
    const catalog: CatalogData = {
      abc: { message: 'Hello', translation: 'Bonjour' },
    }

    const result = await translateCatalog({
      provider: 'claude',
      sourceLocale: 'en',
      targetLocale: 'fr',
      catalog,
      batchSize: 10,
    })

    expect(result.translated).toBe(0)
    expect(result.catalog).toEqual(catalog)
    expect(result.warnings).toEqual([])
  })

  it('recovers from invokeAI errors and reports them as warnings', async () => {
    vi.mocked(invokeAI).mockRejectedValueOnce(new Error('AI provider crashed'))

    const catalog: CatalogData = {
      abc: { message: 'Hello' },
    }

    const result = await translateCatalog({
      provider: 'claude',
      sourceLocale: 'en',
      targetLocale: 'fr',
      catalog,
      batchSize: 10,
    })

    expect(result.translated).toBe(0)
    expect(result.warnings).toContainEqual(expect.stringContaining('Batch 1 failed'))
    expect(result.warnings).toContainEqual(expect.stringContaining('AI provider crashed'))
  })

  it('warns for keys missing from AI translation response', async () => {
    vi.mocked(invokeAI).mockResolvedValueOnce({ stdout: '{"abc": "Bonjour"}', attempts: 1 })

    const catalog: CatalogData = {
      abc: { message: 'Hello' },
      def: { message: 'World' },
    }

    const result = await translateCatalog({
      provider: 'claude',
      sourceLocale: 'en',
      targetLocale: 'fr',
      catalog,
      batchSize: 10,
    })

    // 'abc' should be translated, 'def' should remain untranslated (key missing from AI response)
    expect(result.catalog['abc']?.translation).toBe('Bonjour')
    expect(result.translated).toBe(1)
    expect(result.warnings).toContainEqual(expect.stringContaining('Missing translation for key'))
    expect(result.warnings).toContainEqual(expect.stringContaining('def'))
  })

  it('continues translating after a batch failure (partial success)', async () => {
    // Batch 1 fails, batch 2 succeeds
    vi.mocked(invokeAI)
      .mockRejectedValueOnce(new Error('rate limited'))
      .mockResolvedValueOnce({ stdout: '{"key2": "翻訳2"}', attempts: 1 })

    const catalog: CatalogData = {
      key1: { message: 'Hello' },
      key2: { message: 'World' },
    }

    const result = await translateCatalog({
      provider: 'claude',
      sourceLocale: 'en',
      targetLocale: 'ja',
      catalog,
      batchSize: 1,
    })

    expect(result.translated).toBe(1)
    expect(result.catalog['key2']?.translation).toBe('翻訳2')
    expect(result.catalog['key1']?.translation).toBeUndefined()
    expect(result.warnings).toContainEqual(expect.stringContaining('Batch 1 failed'))
    expect(result.warnings).toContainEqual(expect.stringContaining('rate limited'))
  })

  it('returns zero translations when all batches fail', async () => {
    vi.mocked(invokeAI).mockRejectedValue(new Error('service down'))

    const catalog: CatalogData = {
      key1: { message: 'Hello' },
    }

    const result = await translateCatalog({
      provider: 'claude',
      sourceLocale: 'en',
      targetLocale: 'ja',
      catalog,
      batchSize: 10,
    })

    expect(result.translated).toBe(0)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings).toContainEqual(expect.stringContaining('failed'))
  })
})
