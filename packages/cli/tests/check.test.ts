import { describe, it, expect } from 'vitest'
import { checkCoverage, formatCheckText, formatCheckGitHub, formatCheckJson } from '../src/check'
import type { CatalogData } from '../src/catalog'

describe('checkCoverage', () => {
  const fullCatalogs: Record<string, CatalogData> = {
    en: {
      'greeting': { message: 'Hello', translation: 'Hello' },
      'farewell': { message: 'Goodbye', translation: 'Goodbye' },
      'thanks': { message: 'Thank you', translation: 'Thank you' },
    },
    ja: {
      'greeting': { message: 'Hello', translation: 'こんにちは' },
      'farewell': { message: 'Goodbye', translation: 'さようなら' },
      'thanks': { message: 'Thank you', translation: 'ありがとう' },
    },
  }

  it('passes when all translations are complete', () => {
    const output = checkCoverage(fullCatalogs, {
      sourceLocale: 'en',
      minCoverage: 100,
      format: 'text',
    })

    expect(output.passed).toBe(true)
    expect(output.results).toHaveLength(1) // only ja (en is source)
    expect(output.results[0]!.coverage).toBe(100)
    expect(output.results[0]!.translated).toBe(3)
    expect(output.results[0]!.missing).toBe(0)
  })

  it('fails when translations are incomplete', () => {
    const catalogs: Record<string, CatalogData> = {
      en: fullCatalogs['en']!,
      ja: {
        'greeting': { message: 'Hello', translation: 'こんにちは' },
        'farewell': { message: 'Goodbye', translation: '' },
        'thanks': { message: 'Thank you' }, // no translation
      },
    }

    const output = checkCoverage(catalogs, {
      sourceLocale: 'en',
      minCoverage: 95,
      format: 'text',
    })

    expect(output.passed).toBe(false)
    expect(output.results[0]!.missing).toBe(2)
    expect(output.results[0]!.coverage).toBeCloseTo(33.3, 0)
  })

  it('passes with lower threshold', () => {
    const catalogs: Record<string, CatalogData> = {
      en: fullCatalogs['en']!,
      ja: {
        'greeting': { message: 'Hello', translation: 'こんにちは' },
        'farewell': { message: 'Goodbye', translation: '' },
        'thanks': { message: 'Thank you' },
      },
    }

    const output = checkCoverage(catalogs, {
      sourceLocale: 'en',
      minCoverage: 30,
      format: 'text',
    })

    expect(output.passed).toBe(true)
  })

  it('filters by locale', () => {
    const catalogs: Record<string, CatalogData> = {
      en: fullCatalogs['en']!,
      ja: fullCatalogs['ja']!,
      zh: {
        'greeting': { message: 'Hello', translation: '你好' },
      },
    }

    const output = checkCoverage(catalogs, {
      sourceLocale: 'en',
      minCoverage: 100,
      locale: 'ja',
      format: 'text',
    })

    expect(output.results).toHaveLength(1)
    expect(output.results[0]!.locale).toBe('ja')
    expect(output.passed).toBe(true)
  })

  it('handles missing source catalog', () => {
    const catalogs: Record<string, CatalogData> = {
      ja: { 'greeting': { message: 'Hello', translation: 'こんにちは' } },
    }

    const output = checkCoverage(catalogs, {
      sourceLocale: 'en',
      minCoverage: 100,
      format: 'text',
    })

    expect(output.passed).toBe(false)
    expect(output.diagnostics[0]!.rule).toBe('missing-source')
  })

  it('handles missing target catalog', () => {
    const catalogs: Record<string, CatalogData> = {
      en: fullCatalogs['en']!,
    }

    const output = checkCoverage(catalogs, {
      sourceLocale: 'en',
      minCoverage: 100,
      locale: 'ja',
      format: 'text',
    })

    expect(output.passed).toBe(false)
    expect(output.results[0]!.coverage).toBe(0)
    expect(output.results[0]!.missing).toBe(3)
  })

  it('reports fuzzy entries', () => {
    const catalogs: Record<string, CatalogData> = {
      en: fullCatalogs['en']!,
      ja: {
        'greeting': { message: 'Hello', translation: 'こんにちは', fuzzy: true },
        'farewell': { message: 'Goodbye', translation: 'さようなら' },
        'thanks': { message: 'Thank you', translation: 'ありがとう' },
      },
    }

    const output = checkCoverage(catalogs, {
      sourceLocale: 'en',
      minCoverage: 100,
      format: 'text',
    })

    expect(output.results[0]!.fuzzy).toBe(1)
    expect(output.results[0]!.translated).toBe(3) // fuzzy still counts as translated
  })

  it('skips obsolete source entries', () => {
    const catalogs: Record<string, CatalogData> = {
      en: {
        'greeting': { message: 'Hello', translation: 'Hello' },
        'old': { message: 'Old', translation: 'Old', obsolete: true },
      },
      ja: {
        'greeting': { message: 'Hello', translation: 'こんにちは' },
      },
    }

    const output = checkCoverage(catalogs, {
      sourceLocale: 'en',
      minCoverage: 100,
      format: 'text',
    })

    expect(output.results[0]!.total).toBe(1) // old is obsolete
    expect(output.passed).toBe(true)
  })

  it('handles empty catalogs', () => {
    const catalogs: Record<string, CatalogData> = {
      en: {},
      ja: {},
    }

    const output = checkCoverage(catalogs, {
      sourceLocale: 'en',
      minCoverage: 100,
      format: 'text',
    })

    expect(output.passed).toBe(true)
    expect(output.results[0]!.coverage).toBe(100)
  })

  it('checks multiple locales', () => {
    const catalogs: Record<string, CatalogData> = {
      en: fullCatalogs['en']!,
      ja: fullCatalogs['ja']!,
      zh: {
        'greeting': { message: 'Hello', translation: '你好' },
        'farewell': { message: 'Goodbye' },
        'thanks': { message: 'Thank you' },
      },
    }

    const output = checkCoverage(catalogs, {
      sourceLocale: 'en',
      minCoverage: 95,
      format: 'text',
    })

    expect(output.results).toHaveLength(2)
    expect(output.passed).toBe(false) // zh fails
    expect(output.results.find((r) => r.locale === 'ja')!.coverage).toBe(100)
    expect(output.results.find((r) => r.locale === 'zh')!.coverage).toBeCloseTo(33.3, 0)
  })
})

describe('formatCheckText', () => {
  it('formats passing output', () => {
    const text = formatCheckText({
      results: [{ locale: 'ja', total: 10, translated: 10, missing: 0, fuzzy: 0, coverage: 100 }],
      passed: true,
      minCoverage: 95,
      actualCoverage: 100,
      diagnostics: [],
    })

    expect(text).toContain('✓ ja: 100.0%')
    expect(text).toContain('PASSED')
  })

  it('formats failing output', () => {
    const text = formatCheckText({
      results: [{ locale: 'ja', total: 10, translated: 9, missing: 1, fuzzy: 0, coverage: 90 }],
      passed: false,
      minCoverage: 95,
      actualCoverage: 90,
      diagnostics: [],
    })

    expect(text).toContain('✗ ja: 90.0%')
    expect(text).toContain('1 missing')
    expect(text).toContain('FAILED')
  })

  it('includes fuzzy count', () => {
    const text = formatCheckText({
      results: [{ locale: 'ja', total: 10, translated: 10, missing: 0, fuzzy: 2, coverage: 100 }],
      passed: true,
      minCoverage: 100,
      actualCoverage: 100,
      diagnostics: [],
    })

    expect(text).toContain('2 fuzzy')
  })
})

describe('formatCheckGitHub', () => {
  it('outputs error annotations for failing locales', () => {
    const github = formatCheckGitHub(
      {
        results: [{ locale: 'ja', total: 10, translated: 9, missing: 1, fuzzy: 0, coverage: 90 }],
        passed: false,
        minCoverage: 95,
        actualCoverage: 90,
        diagnostics: [{
          rule: 'missing-translation',
          severity: 'error',
          message: 'Missing translation for "greeting" in locale "ja"',
          messageId: 'greeting',
          locale: 'ja',
        }],
      },
      './locales',
      'po',
    )

    expect(github).toContain('::error file=./locales/ja.po::')
    expect(github).toContain('::warning file=./locales/ja.po::')
  })
})

describe('formatCheckJson', () => {
  it('outputs valid JSON', () => {
    const json = formatCheckJson({
      results: [{ locale: 'ja', total: 10, translated: 10, missing: 0, fuzzy: 0, coverage: 100 }],
      passed: true,
      minCoverage: 95,
      actualCoverage: 100,
      diagnostics: [],
    })

    const parsed = JSON.parse(json)
    expect(parsed.passed).toBe(true)
    expect(parsed.minCoverage).toBe(95)
    expect(parsed.results).toHaveLength(1)
    expect(parsed.results[0].locale).toBe('ja')
  })
})
