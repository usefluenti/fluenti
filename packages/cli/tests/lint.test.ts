import { describe, it, expect } from 'vitest'
import { lintCatalogs, formatDiagnostics } from '../src/lint'
import type { CatalogData } from '../src/catalog'

describe('lintCatalogs', () => {
  const sourceCatalog: CatalogData = {
    'greeting': { message: 'Hello {name}', translation: 'Hello {name}' },
    'farewell': { message: 'Goodbye', translation: 'Goodbye' },
    'count': { message: '{count, plural, one {# item} other {# items}}', translation: '{count, plural, one {# item} other {# items}}' },
  }

  it('detects missing translations', () => {
    const catalogs: Record<string, CatalogData> = {
      en: sourceCatalog,
      ja: {
        'greeting': { message: 'Hello {name}', translation: 'こんにちは {name}' },
        'farewell': { message: 'Goodbye', translation: '' },
        'count': { message: '{count, plural, one {# item} other {# items}}' },
      },
    }

    const diagnostics = lintCatalogs(catalogs, { sourceLocale: 'en' })
    const missing = diagnostics.filter((d) => d.rule === 'missing-translation')
    expect(missing).toHaveLength(2) // farewell (empty string) and count (no translation)
    expect(missing.every((d) => d.locale === 'ja')).toBe(true)
  })

  it('detects inconsistent placeholders', () => {
    const catalogs: Record<string, CatalogData> = {
      en: sourceCatalog,
      ja: {
        'greeting': { message: 'Hello {name}', translation: 'こんにちは' }, // missing {name}
        'farewell': { message: 'Goodbye', translation: 'さようなら' },
        'count': { message: '{count, plural, one {# item} other {# items}}', translation: '{count, plural, one {#個} other {#個}}' },
      },
    }

    const diagnostics = lintCatalogs(catalogs, { sourceLocale: 'en' })
    const inconsistent = diagnostics.filter((d) => d.rule === 'inconsistent-placeholders')
    expect(inconsistent.length).toBeGreaterThan(0)
    expect(inconsistent.find((d) => d.messageId === 'greeting')).toBeDefined()
  })

  it('detects fuzzy translations', () => {
    const catalogs: Record<string, CatalogData> = {
      en: sourceCatalog,
      ja: {
        'greeting': { message: 'Hello {name}', translation: 'こんにちは {name}', fuzzy: true },
        'farewell': { message: 'Goodbye', translation: 'さようなら' },
        'count': { message: '{count, plural, one {# item} other {# items}}', translation: '{count, plural, one {#個} other {#個}}' },
      },
    }

    const diagnostics = lintCatalogs(catalogs, { sourceLocale: 'en' })
    const fuzzy = diagnostics.filter((d) => d.rule === 'fuzzy-translation')
    expect(fuzzy).toHaveLength(1)
    expect(fuzzy[0]!.messageId).toBe('greeting')
  })

  it('detects orphan translations', () => {
    const catalogs: Record<string, CatalogData> = {
      en: sourceCatalog,
      ja: {
        'greeting': { message: 'Hello {name}', translation: 'こんにちは {name}' },
        'farewell': { message: 'Goodbye', translation: 'さようなら' },
        'count': { message: '{count, plural, one {# item} other {# items}}', translation: '{count, plural, one {#個} other {#個}}' },
        'orphan_key': { message: 'Orphan', translation: '孤児' },
      },
    }

    const diagnostics = lintCatalogs(catalogs, { sourceLocale: 'en' })
    const orphans = diagnostics.filter((d) => d.rule === 'orphan-translation')
    expect(orphans).toHaveLength(1)
    expect(orphans[0]!.messageId).toBe('orphan_key')
  })

  it('detects duplicate source messages', () => {
    const catalogs: Record<string, CatalogData> = {
      en: {
        'key1': { message: 'Hello World', translation: 'Hello World' },
        'key2': { message: 'Hello World', translation: 'Hello World' },
        'key3': { message: 'Goodbye', translation: 'Goodbye' },
      },
    }

    const diagnostics = lintCatalogs(catalogs, { sourceLocale: 'en' })
    const duplicates = diagnostics.filter((d) => d.rule === 'duplicate-message')
    expect(duplicates).toHaveLength(1)
  })

  it('returns error when source catalog is missing', () => {
    const catalogs: Record<string, CatalogData> = {
      ja: { 'greeting': { message: 'Hello', translation: 'こんにちは' } },
    }

    const diagnostics = lintCatalogs(catalogs, { sourceLocale: 'en' })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]!.rule).toBe('missing-source')
    expect(diagnostics[0]!.severity).toBe('error')
  })

  it('respects locale filter', () => {
    const catalogs: Record<string, CatalogData> = {
      en: sourceCatalog,
      ja: { 'greeting': { message: 'Hello {name}', translation: 'こんにちは {name}' } },
      zh: { 'greeting': { message: 'Hello {name}', translation: '你好 {name}' } },
    }

    const diagnostics = lintCatalogs(catalogs, {
      sourceLocale: 'en',
      locales: ['en', 'ja'],
    })

    // Should only lint 'ja', not 'zh'
    expect(diagnostics.every((d) => d.locale !== 'zh')).toBe(true)
  })

  it('returns empty array when all translations are complete', () => {
    const catalogs: Record<string, CatalogData> = {
      en: {
        'hello': { message: 'Hello', translation: 'Hello' },
      },
      ja: {
        'hello': { message: 'Hello', translation: 'こんにちは' },
      },
    }

    const diagnostics = lintCatalogs(catalogs, { sourceLocale: 'en' })
    expect(diagnostics).toHaveLength(0)
  })

  it('skips obsolete entries', () => {
    const catalogs: Record<string, CatalogData> = {
      en: {
        'hello': { message: 'Hello', translation: 'Hello' },
        'old_key': { message: 'Old', translation: 'Old', obsolete: true },
      },
      ja: {
        'hello': { message: 'Hello', translation: 'こんにちは' },
      },
    }

    const diagnostics = lintCatalogs(catalogs, { sourceLocale: 'en' })
    // old_key is obsolete in source, so ja not having it is fine
    expect(diagnostics).toHaveLength(0)
  })

  it('detects missing locale catalog', () => {
    const catalogs: Record<string, CatalogData> = {
      en: {
        'hello': { message: 'Hello', translation: 'Hello' },
      },
    }

    const diagnostics = lintCatalogs(catalogs, {
      sourceLocale: 'en',
      locales: ['en', 'ja'],
    })

    const missingLocale = diagnostics.filter((d) => d.rule === 'missing-locale')
    expect(missingLocale).toHaveLength(1)
    expect(missingLocale[0]!.locale).toBe('ja')
    expect(missingLocale[0]!.severity).toBe('error')
  })

  it('detects extra placeholders in target', () => {
    const catalogs: Record<string, CatalogData> = {
      en: {
        'simple': { message: 'Hello', translation: 'Hello' },
      },
      ja: {
        'simple': { message: 'Hello', translation: 'こんにちは {name}' },
      },
    }

    const diagnostics = lintCatalogs(catalogs, { sourceLocale: 'en' })
    const extra = diagnostics.filter(
      (d) => d.rule === 'inconsistent-placeholders' && d.severity === 'warning',
    )
    expect(extra).toHaveLength(1)
    expect(extra[0]!.message).toContain('extra placeholders')
    expect(extra[0]!.message).toContain('{name}')
  })
})

describe('formatDiagnostics', () => {
  it('returns success message for empty diagnostics', () => {
    const result = formatDiagnostics([])
    expect(result).toContain('All checks passed')
  })

  it('groups diagnostics by rule', () => {
    const result = formatDiagnostics([
      { rule: 'missing-translation', severity: 'error', message: 'Missing A', messageId: 'a', locale: 'ja' },
      { rule: 'missing-translation', severity: 'error', message: 'Missing B', messageId: 'b', locale: 'ja' },
      { rule: 'fuzzy-translation', severity: 'warning', message: 'Fuzzy C', messageId: 'c', locale: 'ja' },
    ])

    expect(result).toContain('missing-translation (2)')
    expect(result).toContain('fuzzy-translation (1)')
    expect(result).toContain('2 errors')
    expect(result).toContain('1 warnings')
  })
})
