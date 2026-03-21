import { describe, it, expect } from 'vitest'
import { negotiateLocale, parseLocale, isRTL, getDirection, validateLocale } from '../src/locale'

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

  it('does not treat 4-char numeric variant as script', () => {
    // BCP 47: '1901' is a variant (historical German), not a script
    expect(parseLocale('de-1901')).toEqual({ language: 'de', region: '1901' })
  })

  it('does not treat alphanumeric 4-char subtag as script', () => {
    // '1694' contains digits, so it's a variant not a script
    expect(parseLocale('ca-1694')).toEqual({ language: 'ca', region: '1694' })
  })

  it('handles 3-part locale where parts[1] is not a script', () => {
    // parts[1] = '1901' (variant), parts[2] = 'DE' (region)
    expect(parseLocale('de-1901-DE')).toEqual({ language: 'de', region: '1901' })
  })

  it('parses sr-Latn-RS correctly', () => {
    expect(parseLocale('sr-Latn-RS')).toEqual({
      language: 'sr',
      script: 'Latn',
      region: 'RS',
    })
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

// ─── validateLocale BCP 47 ──────────────────────────────────────────────

describe('validateLocale', () => {
  describe('valid BCP 47 locales', () => {
    it.each([
      'en',
      'zh-CN',
      'zh-Hans-CN',
      'en-US',
      'ja',
      'pt-BR',
      'en-001',
      'ckb',
    ])('accepts %s', (locale) => {
      expect(() => validateLocale(locale, 'test')).not.toThrow()
    })
  })

  describe('invalid locales', () => {
    it.each([
      ['en<script>', 'XSS injection'],
      ['../../passwd', 'path traversal'],
      ['en US', 'contains space'],
      ['!!!', 'special characters'],
      ['en;drop', 'semicolon injection'],
      ['', 'empty string'],
      ['en/US', 'slash'],
      ['en_US', 'underscore instead of hyphen'],
    ])('rejects %s (%s)', (locale) => {
      expect(() => validateLocale(locale, 'test')).toThrow()
    })
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

// ─── Exhaustive edge cases ───────────────────────────────────────────────

describe('edge cases - exhaustive', () => {
  it('isRTL Pashto (ps)', () => {
    expect(isRTL('ps')).toBe(true)
  })

  it('isRTL Sindhi (sd)', () => {
    expect(isRTL('sd')).toBe(true)
  })

  it('isRTL Uyghur (ug)', () => {
    expect(isRTL('ug')).toBe(true)
  })

  it('isRTL Dhivehi (dv)', () => {
    expect(isRTL('dv')).toBe(true)
  })

  it('isRTL Yiddish (yi)', () => {
    expect(isRTL('yi')).toBe(true)
  })

  it('isRTL N\'Ko (nqo)', () => {
    expect(isRTL('nqo')).toBe(true)
  })

  it('isRTL with script subtag (ar-Arab)', () => {
    expect(isRTL('ar-Arab')).toBe(true)
  })

  it('negotiate multi-script variants zh-Hans/zh-Hant', () => {
    const available = ['zh-Hans', 'zh-Hant', 'en']
    expect(negotiateLocale('zh-Hans', available)).toBe('zh-Hans')
    expect(negotiateLocale('zh-Hant', available)).toBe('zh-Hant')
  })

  it('negotiate exact match priority over language match', () => {
    const available = ['en', 'en-GB', 'en-US']
    expect(negotiateLocale('en-US', available)).toBe('en-US')
    expect(negotiateLocale('en-GB', available)).toBe('en-GB')
  })

  it('negotiate empty string locale', () => {
    // Empty string locale against available locales falls back
    expect(negotiateLocale('', ['en', 'fr'], 'en')).toBe('en')
  })

  it('parseLocale underscore separator en_US', () => {
    // Underscores are not standard BCP 47 separators, parsed as single part
    const result = parseLocale('en_US')
    // Since there's no dash, 'en_US' is treated as a single language tag
    expect(result.language).toBe('en_us')
  })

  it('getDirection covers all RTL languages', () => {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'ckb', 'dv', 'yi', 'nqo']
    for (const lang of rtlLanguages) {
      expect(getDirection(lang)).toBe('rtl')
    }
    // And a few LTR for contrast
    const ltrLanguages = ['en', 'de', 'fr', 'ja', 'zh', 'ko', 'es', 'pt']
    for (const lang of ltrLanguages) {
      expect(getDirection(lang)).toBe('ltr')
    }
  })
})
