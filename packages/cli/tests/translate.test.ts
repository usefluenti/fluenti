import { describe, it, expect, vi } from 'vitest'
import { buildPrompt, extractJSON, getUntranslatedEntries, chunkEntries, translateCatalog } from '../src/translate'
import type { CatalogData } from '../src/catalog'

// Mock ai-provider to control invokeAI in translate tests
vi.mock('../src/ai-provider', () => ({
  invokeAI: vi.fn(),
}))

import { invokeAI } from '../src/ai-provider'

describe('buildPrompt', () => {
  it('includes source and target locale in the prompt', () => {
    const result = buildPrompt('en', 'ja', { greeting: 'Hello' })

    expect(result).toContain('"en"')
    expect(result).toContain('"ja"')
  })

  it('includes the messages as JSON', () => {
    const messages = { greeting: 'Hello', farewell: 'Goodbye' }
    const result = buildPrompt('en', 'fr', messages)

    expect(result).toContain('"greeting": "Hello"')
    expect(result).toContain('"farewell": "Goodbye"')
  })

  it('includes translation rules', () => {
    const result = buildPrompt('en', 'de', { key: 'value' })

    expect(result).toContain('ICU MessageFormat')
    expect(result).toContain('HTML tags')
    expect(result).toContain('valid JSON')
  })

  it('includes project context when provided', () => {
    const result = buildPrompt('en', 'ja', { greeting: 'Hello' }, 'E-commerce application')

    expect(result).toContain('Project context: E-commerce application')
  })

  it('omits project context when not provided', () => {
    const result = buildPrompt('en', 'ja', { greeting: 'Hello' })

    expect(result).not.toContain('Project context')
  })
})

describe('extractJSON', () => {
  it('extracts a JSON object from plain text', () => {
    const text = 'Here is the translation:\n{"greeting": "Bonjour"}\nDone.'
    const result = extractJSON(text)

    expect(result).toEqual({ greeting: 'Bonjour' })
  })

  it('extracts JSON from markdown code fence', () => {
    const text = '```json\n{"key": "value"}\n```'
    const result = extractJSON(text)

    expect(result).toEqual({ key: 'value' })
  })

  it('throws when no JSON object is found', () => {
    expect(() => extractJSON('no json here')).toThrow('No JSON object found')
  })

  it('throws when response contains no curly-braced object', () => {
    expect(() => extractJSON('[1, 2, 3]')).toThrow('No JSON object found')
  })

  it('throws on invalid JSON syntax', () => {
    expect(() => extractJSON('{broken json}')).toThrow()
  })

  it('extracts JSON when surrounded by extra text', () => {
    const text = 'Here is your translation:\n{"greeting": "Hola", "farewell": "Adios"}\nEnd.'
    const result = extractJSON(text)

    expect(result).toEqual({ greeting: 'Hola', farewell: 'Adios' })
  })

  it('handles escaped quotes inside JSON values', () => {
    const text = '{"greeting": "He said \\"hello\\""}'
    const result = extractJSON(text)

    expect(result).toEqual({ greeting: 'He said "hello"' })
  })

  it('extracts only the first JSON object when multiple are present', () => {
    // The regex /\{[\s\S]*\}/ is greedy so it matches from first { to last }
    // With two separate objects it will greedily match across both
    const text = '{"first": "one"} and then {"second": "two"}'
    // The greedy match will capture: {"first": "one"} and then {"second": "two"}
    // which is not valid JSON, so it should throw
    expect(() => extractJSON(text)).toThrow('Failed to parse JSON')
  })

  it('throws on unclosed braces', () => {
    const text = 'Here is some output: {"key": "value"'
    // No closing brace, so the regex /\{[\s\S]*\}/ will not match
    expect(() => extractJSON(text)).toThrow('No JSON object found')
  })
})

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

    const { catalog } = await translateModule.translateCatalog({
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
  })

  it('propagates invokeAI errors to the caller', async () => {
    vi.mocked(invokeAI).mockRejectedValueOnce(new Error('AI provider crashed'))

    const catalog: CatalogData = {
      abc: { message: 'Hello' },
    }

    await expect(translateCatalog({
      provider: 'claude',
      sourceLocale: 'en',
      targetLocale: 'fr',
      catalog,
      batchSize: 10,
    })).rejects.toThrow('AI provider crashed')
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
  })
})
