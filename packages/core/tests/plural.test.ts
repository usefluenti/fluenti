import { describe, it, expect } from 'vitest'
import { resolvePlural, resolvePluralCategory } from '../src/plural'

describe('resolvePlural', () => {
  it('resolves exact match =0', () => {
    expect(resolvePlural(0, { '=0': 'zero', 'other': 'other' }, 'en')).toBe('=0')
  })

  it('resolves exact match =1', () => {
    expect(resolvePlural(1, { '=1': 'one', 'one': 'cldr_one', 'other': 'other' }, 'en')).toBe('=1')
  })

  it('resolves CLDR category one', () => {
    expect(resolvePlural(1, { 'one': 'x', 'other': 'y' }, 'en')).toBe('one')
  })

  it('resolves CLDR category other', () => {
    expect(resolvePlural(5, { 'one': 'x', 'other': 'y' }, 'en')).toBe('other')
  })

  it('falls back to other when category not in options', () => {
    expect(resolvePlural(1, { 'other': 'y' }, 'en')).toBe('other')
  })

  it('handles Russian few category', () => {
    expect(resolvePlural(3, { 'one': 'a', 'few': 'b', 'many': 'c', 'other': 'd' }, 'ru')).toBe('few')
  })

  it('handles Russian many category', () => {
    expect(resolvePlural(5, { 'one': 'a', 'few': 'b', 'many': 'c', 'other': 'd' }, 'ru')).toBe('many')
  })

  it('handles Arabic two category', () => {
    expect(resolvePlural(2, { 'zero': 'a', 'one': 'b', 'two': 'c', 'few': 'd', 'many': 'e', 'other': 'f' }, 'ar')).toBe('two')
  })

  it('caches Intl.PluralRules instances', () => {
    // Just verify it works correctly on repeated calls (cache path)
    expect(resolvePlural(1, { 'one': 'x', 'other': 'y' }, 'en')).toBe('one')
    expect(resolvePlural(2, { 'one': 'x', 'other': 'y' }, 'en')).toBe('other')
  })
})

describe('resolvePluralCategory', () => {
  it('resolves CLDR category without checking exact matches', () => {
    expect(resolvePluralCategory(1, { '=1': 'exact', 'one': 'cldr', 'other': 'o' }, 'en')).toBe('one')
  })

  it('returns other when category not found', () => {
    expect(resolvePluralCategory(5, { 'one': 'x' }, 'en')).toBe('other')
  })

  it('handles different locales', () => {
    expect(resolvePluralCategory(3, { 'few': 'x', 'other': 'y' }, 'ru')).toBe('few')
  })
})

// ─── Edge case values ──────────────────────────────────────────────────

describe('edge case values', () => {
  it('handles float 0.5', () => {
    expect(resolvePlural(0.5, { 'one': 'x', 'other': 'y' }, 'en')).toBe('other')
  })

  it('handles float 1.5', () => {
    expect(resolvePlural(1.5, { 'one': 'x', 'other': 'y' }, 'en')).toBe('other')
  })

  it('handles negative -1', () => {
    const result = resolvePlural(-1, { 'one': 'x', 'other': 'y' }, 'en')
    expect(result).toBe('one')
  })

  it('handles negative -5', () => {
    expect(resolvePlural(-5, { 'one': 'x', 'other': 'y' }, 'en')).toBe('other')
  })

  it('handles NaN', () => {
    const result = resolvePlural(NaN, { 'one': 'x', 'other': 'y' }, 'en')
    expect(result).toBe('other')
  })

  it('handles Infinity', () => {
    const result = resolvePlural(Infinity, { 'one': 'x', 'other': 'y' }, 'en')
    expect(result).toBe('other')
  })
})

// ─── Complex locales ───────────────────────────────────────────────────

describe('complex locales', () => {
  it('Polish (pl): one/few/many/other', () => {
    const opts = { 'one': 'a', 'few': 'b', 'many': 'c', 'other': 'd' }
    expect(resolvePlural(1, opts, 'pl')).toBe('one')
    expect(resolvePlural(3, opts, 'pl')).toBe('few')
    expect(resolvePlural(5, opts, 'pl')).toBe('many')
    expect(resolvePlural(1.5, opts, 'pl')).toBe('other')
  })

  it('Japanese (ja): only other', () => {
    const opts = { 'one': 'a', 'other': 'b' }
    expect(resolvePlural(1, opts, 'ja')).toBe('other')
    expect(resolvePlural(0, opts, 'ja')).toBe('other')
    expect(resolvePlural(100, opts, 'ja')).toBe('other')
  })
})

// ─── Exhaustive edge cases ───────────────────────────────────────────────

describe('edge cases - exhaustive', () => {
  it('exact match =2', () => {
    expect(resolvePlural(2, { '=2': 'pair', 'other': 'many' }, 'en')).toBe('=2')
  })

  it('exact match =100', () => {
    expect(resolvePlural(100, { '=100': 'century', 'other': 'many' }, 'en')).toBe('=100')
  })

  it('exact match takes priority over CLDR category', () => {
    // In English, 1 is "one" in CLDR, but =1 exact match should win
    expect(resolvePlural(1, { '=1': 'exactly-one', 'one': 'cldr-one', 'other': 'rest' }, 'en')).toBe('=1')
  })

  it('ordinal=true uses ordinal rules', () => {
    // English ordinal: 1→one (1st), 2→two (2nd), 3→few (3rd), 4→other (4th)
    const opts = { 'one': '1st', 'two': '2nd', 'few': '3rd', 'other': 'th' }
    expect(resolvePlural(1, opts, 'en', true)).toBe('one')
    expect(resolvePlural(2, opts, 'en', true)).toBe('two')
    expect(resolvePlural(3, opts, 'en', true)).toBe('few')
    expect(resolvePlural(4, opts, 'en', true)).toBe('other')
  })

  it('Arabic zero category', () => {
    const opts = { 'zero': 'z', 'one': 'o', 'two': 't', 'few': 'f', 'many': 'm', 'other': 'x' }
    expect(resolvePlural(0, opts, 'ar')).toBe('zero')
  })

  it('Arabic few category', () => {
    const opts = { 'zero': 'z', 'one': 'o', 'two': 't', 'few': 'f', 'many': 'm', 'other': 'x' }
    // Arabic "few" is for numbers like 3-10
    expect(resolvePlural(3, opts, 'ar')).toBe('few')
  })

  it('French: 0 and 1 are both "one"', () => {
    const opts = { 'one': 'singular', 'other': 'plural' }
    expect(resolvePlural(0, opts, 'fr')).toBe('one')
    expect(resolvePlural(1, opts, 'fr')).toBe('one')
    expect(resolvePlural(2, opts, 'fr')).toBe('other')
  })

  it('locale with region subtag en-US', () => {
    const opts = { 'one': 'item', 'other': 'items' }
    expect(resolvePlural(1, opts, 'en-US')).toBe('one')
    expect(resolvePlural(5, opts, 'en-US')).toBe('other')
  })

  it('Number.MAX_SAFE_INTEGER', () => {
    const opts = { 'one': 'x', 'other': 'y' }
    expect(resolvePlural(Number.MAX_SAFE_INTEGER, opts, 'en')).toBe('other')
  })

  it('negative zero -0', () => {
    // -0 has exact key "=0" since `=${-0}` is "=0"
    const opts = { '=0': 'none', 'one': 'x', 'other': 'y' }
    expect(resolvePlural(-0, opts, 'en')).toBe('=0')
  })
})
