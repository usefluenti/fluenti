import { describe, it, expect } from 'vitest'
import { updateCatalog } from '../src/catalog'
import type { CatalogData } from '../src/catalog'
import type { ExtractedMessage } from '@fluenti/core'

function makeMessage(id: string, message: string, file = 'test.vue', line = 1): ExtractedMessage {
  return { id, message, origin: { file, line } }
}

describe('updateCatalog', () => {
  it('adds new messages to empty catalog', () => {
    const existing: CatalogData = {}
    const extracted = [makeMessage('abc', 'Hello')]

    const { catalog, result } = updateCatalog(existing, extracted)

    expect(result.added).toBe(1)
    expect(result.unchanged).toBe(0)
    expect(result.obsolete).toBe(0)
    expect(catalog['abc']).toEqual({
      message: 'Hello',
      origin: 'test.vue:1',
    })
  })

  it('preserves existing translations', () => {
    const existing: CatalogData = {
      abc: {
        message: 'Hello',
        translation: 'Bonjour',
        origin: 'old.vue:5',
      },
    }
    const extracted = [makeMessage('abc', 'Hello', 'new.vue', 10)]

    const { catalog, result } = updateCatalog(existing, extracted)

    expect(result.unchanged).toBe(1)
    expect(catalog['abc'].translation).toBe('Bonjour')
    expect(catalog['abc'].origin).toBe('new.vue:10')
  })

  it('marks removed messages as obsolete', () => {
    const existing: CatalogData = {
      abc: { message: 'Hello', translation: 'Bonjour' },
      def: { message: 'World', translation: 'Monde' },
    }
    const extracted = [makeMessage('abc', 'Hello')]

    const { catalog, result } = updateCatalog(existing, extracted)

    expect(result.obsolete).toBe(1)
    expect(catalog['def'].obsolete).toBe(true)
    expect(catalog['def'].translation).toBe('Monde')
  })

  it('clears obsolete flag when message reappears', () => {
    const existing: CatalogData = {
      abc: { message: 'Hello', translation: 'Bonjour', obsolete: true },
    }
    const extracted = [makeMessage('abc', 'Hello')]

    const { catalog } = updateCatalog(existing, extracted)

    expect(catalog['abc'].obsolete).toBe(false)
  })

  it('handles mixed add, keep, and obsolete', () => {
    const existing: CatalogData = {
      abc: { message: 'Hello' },
      def: { message: 'World' },
    }
    const extracted = [
      makeMessage('abc', 'Hello'),
      makeMessage('ghi', 'New message'),
    ]

    const { catalog, result } = updateCatalog(existing, extracted)

    expect(result.added).toBe(1)
    expect(result.unchanged).toBe(1)
    expect(result.obsolete).toBe(1)
    expect(catalog['ghi']).toBeDefined()
    expect(catalog['def'].obsolete).toBe(true)
  })

  it('returns correct stats for empty extraction', () => {
    const existing: CatalogData = {
      abc: { message: 'Hello' },
    }
    const { result } = updateCatalog(existing, [])

    expect(result.added).toBe(0)
    expect(result.unchanged).toBe(0)
    expect(result.obsolete).toBe(1)
  })

  it('handles empty catalog and empty extraction', () => {
    const { catalog, result } = updateCatalog({}, [])

    expect(Object.keys(catalog)).toHaveLength(0)
    expect(result.added).toBe(0)
    expect(result.unchanged).toBe(0)
    expect(result.obsolete).toBe(0)
  })
})
