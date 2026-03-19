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
    expect(catalog['abc']!.translation).toBe('Bonjour')
    expect(catalog['abc']!.origin).toBe('new.vue:10')
  })

  it('marks removed messages as obsolete', () => {
    const existing: CatalogData = {
      abc: { message: 'Hello', translation: 'Bonjour' },
      def: { message: 'World', translation: 'Monde' },
    }
    const extracted = [makeMessage('abc', 'Hello')]

    const { catalog, result } = updateCatalog(existing, extracted)

    expect(result.obsolete).toBe(1)
    expect(catalog['def']!.obsolete).toBe(true)
    expect(catalog['def']!.translation).toBe('Monde')
  })

  it('clears obsolete flag when message reappears', () => {
    const existing: CatalogData = {
      abc: { message: 'Hello', translation: 'Bonjour', obsolete: true },
    }
    const extracted = [makeMessage('abc', 'Hello')]

    const { catalog } = updateCatalog(existing, extracted)

    expect(catalog['abc']!.obsolete).toBe(false)
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
    expect(catalog['def']!.obsolete).toBe(true)
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

  // ─── Additional edge cases ─────────────────────────────────────────────────

  it('returns all obsolete when extracted messages is empty', () => {
    const existing: CatalogData = {
      abc: { message: 'Hello', translation: 'Bonjour' },
      def: { message: 'World', translation: 'Monde' },
    }
    const { catalog, result } = updateCatalog(existing, [])

    expect(result.added).toBe(0)
    expect(result.unchanged).toBe(0)
    expect(result.obsolete).toBe(2)
    expect(catalog['abc']!.obsolete).toBe(true)
    expect(catalog['def']!.obsolete).toBe(true)
  })

  it('adds all new when existing catalog is empty', () => {
    const extracted = [
      makeMessage('a', 'Hello'),
      makeMessage('b', 'World'),
    ]
    const { catalog, result } = updateCatalog({}, extracted)

    expect(result.added).toBe(2)
    expect(result.unchanged).toBe(0)
    expect(result.obsolete).toBe(0)
    expect(catalog['a']!.message).toBe('Hello')
    expect(catalog['b']!.message).toBe('World')
  })

  it('preserves existing translation when re-extracted', () => {
    const existing: CatalogData = {
      abc: { message: 'Hello', translation: 'Bonjour', origin: 'old.vue:1' },
    }
    const extracted = [makeMessage('abc', 'Hello', 'new.vue', 5)]

    const { catalog } = updateCatalog(existing, extracted)

    expect(catalog['abc']!.translation).toBe('Bonjour')
    expect(catalog['abc']!.origin).toBe('new.vue:5')
  })

  it('marks deleted messages as obsolete but keeps translation', () => {
    const existing: CatalogData = {
      abc: { message: 'Hello', translation: 'Bonjour' },
    }
    const { catalog } = updateCatalog(existing, [])

    expect(catalog['abc']!.obsolete).toBe(true)
    expect(catalog['abc']!.translation).toBe('Bonjour')
  })

  it('returns correct counts for mixed operations', () => {
    const existing: CatalogData = {
      keep: { message: 'Keep' },
      remove: { message: 'Remove' },
    }
    const extracted = [
      makeMessage('keep', 'Keep'),
      makeMessage('new1', 'New one'),
      makeMessage('new2', 'New two'),
    ]
    const { result } = updateCatalog(existing, extracted)

    expect(result.added).toBe(2)
    expect(result.unchanged).toBe(1)
    expect(result.obsolete).toBe(1)
  })

  it('updates origin when message is re-extracted from new location', () => {
    const existing: CatalogData = {
      abc: { message: 'Hello', origin: 'old.vue:1' },
    }
    const extracted = [makeMessage('abc', 'Hello', 'moved.vue', 42)]

    const { catalog } = updateCatalog(existing, extracted)

    expect(catalog['abc']!.origin).toBe('moved.vue:42')
  })

  it('merges origins when duplicate IDs appear in extracted messages', () => {
    const extracted = [
      makeMessage('abc', 'Hello', 'a.vue', 1),
      makeMessage('abc', 'Hello', 'b.vue', 2),
    ]
    const { catalog } = updateCatalog({}, extracted)

    expect(catalog['abc']).toBeDefined()
    expect(Array.isArray(catalog['abc']!.origin)).toBe(true)
    expect(catalog['abc']!.origin).toContain('a.vue:1')
    expect(catalog['abc']!.origin).toContain('b.vue:2')
  })

  it('preserves fuzzy flag from existing entries', () => {
    const existing: CatalogData = {
      abc: { message: 'Hello', translation: 'Bonjour', fuzzy: true },
    }
    const extracted = [makeMessage('abc', 'Hello')]

    const { catalog } = updateCatalog(existing, extracted)

    expect(catalog['abc']!.fuzzy).toBe(true)
    expect(catalog['abc']!.translation).toBe('Bonjour')
  })

  it('strips fuzzy flags when stripFuzzy option is set', () => {
    const existing: CatalogData = {
      abc: { message: 'Hello', translation: 'Bonjour', fuzzy: true },
    }
    const extracted = [makeMessage('abc', 'Hello')]

    const { catalog } = updateCatalog(existing, extracted, { stripFuzzy: true })

    expect(catalog['abc']!.fuzzy).toBeUndefined()
    expect(catalog['abc']!.translation).toBe('Bonjour')
  })

  it('strips fuzzy from obsolete entries when stripFuzzy is set', () => {
    const existing: CatalogData = {
      abc: { message: 'Hello', translation: 'Bonjour', fuzzy: true },
    }

    const { catalog } = updateCatalog(existing, [], { stripFuzzy: true })

    expect(catalog['abc']!.obsolete).toBe(true)
    expect(catalog['abc']!.fuzzy).toBeUndefined()
  })
})
