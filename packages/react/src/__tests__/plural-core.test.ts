import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { resolveCategory, replaceHash } from '../components/plural-core'

describe('resolveCategory', () => {
  it('returns zero when value=0 and zero is available', () => {
    const available = { zero: true, one: true, other: true }
    expect(resolveCategory(0, 'en', available)).toBe('zero')
  })

  it('falls back to CLDR category when available', () => {
    // In English, value=1 selects "one" per CLDR rules
    const available = { zero: false, one: true, other: true }
    expect(resolveCategory(1, 'en', available)).toBe('one')
  })

  it('falls back to other when CLDR category is not available', () => {
    // In English, value=1 selects "one" per CLDR, but one is not available
    const available = { zero: false, one: false, other: true }
    expect(resolveCategory(1, 'en', available)).toBe('other')
  })
})

describe('replaceHash', () => {
  it('replaces all # occurrences in a string', () => {
    expect(replaceHash('# of # items', '5')).toBe('5 of 5 items')
  })

  it('returns original value for non-string node (number)', () => {
    expect(replaceHash(42 as unknown as string, '5')).toBe(42)
  })

  it('returns original value for ReactElement node', () => {
    const element = createElement('span', null, 'hello')
    expect(replaceHash(element, '5')).toBe(element)
  })
})
