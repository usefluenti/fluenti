import { describe, it, expect } from 'vitest'
import { negotiateLocale, parseLocale } from '../src/locale'

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
