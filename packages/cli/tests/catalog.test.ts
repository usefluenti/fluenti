import { describe, it, expect } from 'vitest'
import { updateCatalog } from '../src/catalog'
import type { CatalogData } from '../src/catalog'
import type { ExtractedMessage } from '@fluenti/core/internal'

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

  // ─── Carry-forward entry matching ────────────────────────────────────────────

  it('carries forward translation when message gets a context (same message, same origin)', () => {
    // Old entry: no context, has translation
    const existing: CatalogData = {
      'old-id': { message: 'Save', translation: 'Enregistrer', origin: 'Button.vue:10' },
    }
    // New extraction: same message, same origin, but now with a context → new ID
    const extracted = [
      {
        id: 'new-id',
        message: 'Save',
        context: 'toolbar',
        origin: { file: 'Button.vue', line: 10 },
      },
    ]

    const { catalog, result } = updateCatalog(existing, extracted)

    // The new entry should carry forward the old translation
    expect(catalog['new-id']!.translation).toBe('Enregistrer')
    expect(catalog['new-id']!.context).toBe('toolbar')
    // The old entry should be marked obsolete
    expect(catalog['old-id']!.obsolete).toBe(true)
    expect(result.unchanged).toBe(1)
    expect(result.obsolete).toBe(1)
  })

  it('does not carry forward when message text differs', () => {
    const existing: CatalogData = {
      'old-id': { message: 'Save', translation: 'Enregistrer', origin: 'Button.vue:10' },
    }
    const extracted = [
      {
        id: 'new-id',
        message: 'Cancel',
        context: 'toolbar',
        origin: { file: 'Button.vue', line: 10 },
      },
    ]

    const { catalog, result } = updateCatalog(existing, extracted)

    // No carry-forward: different message text
    expect(catalog['new-id']!.translation).toBeUndefined()
    expect(result.added).toBe(1)
  })

  it('does not carry forward when extracted message has no context', () => {
    const existing: CatalogData = {
      'old-id': { message: 'Save', translation: 'Enregistrer', origin: 'Button.vue:10' },
    }
    const extracted = [
      {
        id: 'new-id',
        message: 'Save',
        origin: { file: 'Button.vue', line: 10 },
      },
    ]

    const { catalog, result } = updateCatalog(existing, extracted)

    // No carry-forward without context on extracted message
    expect(catalog['new-id']!.translation).toBeUndefined()
    expect(result.added).toBe(1)
  })

  it('does not carry forward when origin file differs', () => {
    const existing: CatalogData = {
      'old-id': { message: 'Save', translation: 'Enregistrer', origin: 'Button.vue:10' },
    }
    const extracted = [
      {
        id: 'new-id',
        message: 'Save',
        context: 'toolbar',
        origin: { file: 'OtherFile.vue', line: 10 },
      },
    ]

    const { catalog } = updateCatalog(existing, extracted)

    expect(catalog['new-id']!.translation).toBeUndefined()
  })

  it('carries forward when origin matches by file name only (different line)', () => {
    const existing: CatalogData = {
      'old-id': { message: 'Save', translation: 'Enregistrer', origin: 'Button.vue:5' },
    }
    const extracted = [
      {
        id: 'new-id',
        message: 'Save',
        context: 'toolbar',
        origin: { file: 'Button.vue', line: 10 },
      },
    ]

    const { catalog } = updateCatalog(existing, extracted)

    // Should carry forward because the file name matches (originFile comparison)
    expect(catalog['new-id']!.translation).toBe('Enregistrer')
  })

  it('does not carry forward the same entry twice (consumed carry-forward)', () => {
    const existing: CatalogData = {
      'old-id': { message: 'Save', translation: 'Enregistrer', origin: 'Button.vue:10' },
    }
    const extracted = [
      {
        id: 'new-id-1',
        message: 'Save',
        context: 'toolbar',
        origin: { file: 'Button.vue', line: 10 },
      },
      {
        id: 'new-id-2',
        message: 'Save',
        context: 'sidebar',
        origin: { file: 'Button.vue', line: 10 },
      },
    ]

    const { catalog } = updateCatalog(existing, extracted)

    // First one gets the carry-forward
    expect(catalog['new-id-1']!.translation).toBe('Enregistrer')
    // Second one does NOT get carry-forward (already consumed)
    expect(catalog['new-id-2']!.translation).toBeUndefined()
  })

  it('does not carry forward from entries that have a context defined', () => {
    const existing: CatalogData = {
      'old-id': { message: 'Save', translation: 'Enregistrer', context: 'existing', origin: 'Button.vue:10' },
    }
    const extracted = [
      {
        id: 'new-id',
        message: 'Save',
        context: 'toolbar',
        origin: { file: 'Button.vue', line: 10 },
      },
    ]

    const { catalog } = updateCatalog(existing, extracted)

    // Should NOT carry forward because the existing entry already has a context
    expect(catalog['new-id']!.translation).toBeUndefined()
  })

  it('handles sameOrigin with array of origins', () => {
    const existing: CatalogData = {
      'old-id': { message: 'Save', translation: 'Enregistrer', origin: ['Button.vue:10', 'Form.vue:5'] },
    }
    const extracted = [
      {
        id: 'new-id',
        message: 'Save',
        context: 'toolbar',
        origin: { file: 'Form.vue', line: 5 },
      },
    ]

    const { catalog } = updateCatalog(existing, extracted)

    // Should carry forward because Form.vue:5 is in the origin array
    expect(catalog['new-id']!.translation).toBe('Enregistrer')
  })

  it('does not carry forward when existing entry has no origin', () => {
    const existing: CatalogData = {
      'old-id': { message: 'Save', translation: 'Enregistrer' },
    }
    const extracted = [
      {
        id: 'new-id',
        message: 'Save',
        context: 'toolbar',
        origin: { file: 'Button.vue', line: 10 },
      },
    ]

    const { catalog } = updateCatalog(existing, extracted)

    // Should NOT carry forward because existing entry has no origin to match
    expect(catalog['new-id']!.translation).toBeUndefined()
  })

  it('updates message text on re-extraction', () => {
    const existing: CatalogData = {
      abc: { message: 'Old text', translation: 'Ancienne traduction', origin: 'Page.vue:5' },
    }
    const extracted = [
      { id: 'abc', message: 'New text', origin: { file: 'Page.vue', line: 5 } },
    ]

    const { catalog } = updateCatalog(existing, extracted)

    // message should be updated but translation preserved
    expect(catalog['abc']!.message).toBe('New text')
    expect(catalog['abc']!.translation).toBe('Ancienne traduction')
  })

  it('preserves comment from extraction', () => {
    const existing: CatalogData = {}
    const extracted = [
      { id: 'abc', message: 'Hello', comment: 'Greeting header', origin: { file: 'App.vue', line: 1 } },
    ]

    const { catalog } = updateCatalog(existing, extracted)

    expect(catalog['abc']!.comment).toBe('Greeting header')
  })
})
