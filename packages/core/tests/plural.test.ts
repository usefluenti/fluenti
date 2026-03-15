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
