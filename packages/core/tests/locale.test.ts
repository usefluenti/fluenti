import { describe, it, expect } from 'vitest'
import { negotiateLocale, parseLocale, isRTL, getDirection } from '../src/locale'

describe('parseLocale', () => {
  it('parses language only', () => {
    expect(parseLocale('en')).toEqual({ language: 'en' })
  })

  it('parses language + region', () => {
    expect(parseLocale('en-US')).toEqual({ language: 'en', region: 'US' })
  })

  it('parses language + script + region', () => {
    expect(parseLocale('zh-Hans-CN')).toEqual({
      language: 'zh',
      script: 'Hans',
      region: 'CN',
    })
  })

  it('parses language + script (no region)', () => {
    expect(parseLocale('zh-Hant')).toEqual({
      language: 'zh',
      script: 'Hant',
    })
  })

  it('normalizes case', () => {
    expect(parseLocale('EN-us')).toEqual({ language: 'en', region: 'US' })
  })
})

describe('negotiateLocale', () => {
  it('finds exact match', () => {
    expect(negotiateLocale('en-US', ['en-US', 'fr'])).toBe('en-US')
  })

  it('finds exact match case-insensitive', () => {
    expect(negotiateLocale('en-us', ['en-US', 'fr'])).toBe('en-US')
  })

  it('falls back to language match', () => {
    expect(negotiateLocale('en-GB', ['en-US', 'fr'])).toBe('en-US')
  })

  it('uses fallback when no match', () => {
    expect(negotiateLocale('ja', ['en', 'fr'], 'en')).toBe('en')
  })

  it('uses first available when no fallback given', () => {
    expect(negotiateLocale('ja', ['en', 'fr'])).toBe('en')
  })

  it('handles array of requested locales', () => {
    expect(negotiateLocale(['ja', 'fr', 'en'], ['en', 'fr'])).toBe('fr')
  })

  it('handles empty available list with fallback', () => {
    expect(negotiateLocale('en', [], 'en')).toBe('en')
  })

  it('handles zh-Hans vs zh-CN', () => {
    expect(negotiateLocale('zh', ['zh-CN', 'en'])).toBe('zh-CN')
  })
})

describe('isRTL', () => {
  it('returns true for Arabic', () => {
    expect(isRTL('ar')).toBe(true)
  })

  it('returns true for Arabic with region', () => {
    expect(isRTL('ar-SA')).toBe(true)
    expect(isRTL('ar-EG')).toBe(true)
  })

  it('returns true for Hebrew', () => {
    expect(isRTL('he')).toBe(true)
    expect(isRTL('he-IL')).toBe(true)
  })

  it('returns true for Persian', () => {
    expect(isRTL('fa')).toBe(true)
    expect(isRTL('fa-IR')).toBe(true)
  })

  it('returns true for Urdu', () => {
    expect(isRTL('ur')).toBe(true)
  })

  it('returns true for Central Kurdish', () => {
    expect(isRTL('ckb')).toBe(true)
  })

  it('returns false for LTR languages', () => {
    expect(isRTL('en')).toBe(false)
    expect(isRTL('en-US')).toBe(false)
    expect(isRTL('de')).toBe(false)
    expect(isRTL('zh-CN')).toBe(false)
    expect(isRTL('ja')).toBe(false)
    expect(isRTL('fr')).toBe(false)
  })
})

describe('getDirection', () => {
  it('returns rtl for RTL locales', () => {
    expect(getDirection('ar')).toBe('rtl')
    expect(getDirection('he')).toBe('rtl')
    expect(getDirection('fa-IR')).toBe('rtl')
  })

  it('returns ltr for LTR locales', () => {
    expect(getDirection('en')).toBe('ltr')
    expect(getDirection('de-DE')).toBe('ltr')
    expect(getDirection('ja')).toBe('ltr')
  })
})

// ─── Edge cases ────────────────────────────────────────────────────────

describe('parseLocale edge cases', () => {
  it('handles empty string', () => {
    const result = parseLocale('')
    expect(result.language).toBe('')
  })

  it('handles trailing dash', () => {
    const result = parseLocale('en-')
    expect(result.language).toBe('en')
    expect(result.region).toBe('')
  })

  it('handles numeric region codes', () => {
    const result = parseLocale('en-001')
    expect(result.language).toBe('en')
    expect(result.region).toBe('001')
  })

  it('handles locale with 4+ parts (extension subtags)', () => {
    const result = parseLocale('zh-Hans-CN-extra')
    expect(result.language).toBe('zh')
    expect(result.script).toBe('Hans')
    expect(result.region).toBe('CN')
  })
})

describe('negotiateLocale edge cases', () => {
  it('handles empty requested array with fallback', () => {
    expect(negotiateLocale([], ['en', 'fr'], 'en')).toBe('en')
  })

  it('handles empty requested array without fallback', () => {
    expect(negotiateLocale([], ['en', 'fr'])).toBe('en')
  })

  it('handles single string locale (not array)', () => {
    expect(negotiateLocale('fr', ['en', 'fr'])).toBe('fr')
  })

  it('matches script-based locale zh-Hans to zh-CN', () => {
    expect(negotiateLocale('zh-Hans', ['zh-CN', 'en'])).toBe('zh-CN')
  })
})
