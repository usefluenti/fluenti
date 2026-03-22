import { describe, expect, it } from 'vitest'
import {
  PLURAL_CATEGORIES,
  buildICUPluralMessage,
  buildICUSelectMessage,
  normalizeSelectForms,
  offsetIndices,
} from '../src/icu-builders'

describe('PLURAL_CATEGORIES', () => {
  it('contains all six ICU plural categories in order', () => {
    expect(PLURAL_CATEGORIES).toEqual(['zero', 'one', 'two', 'few', 'many', 'other'])
  })
})

describe('buildICUPluralMessage', () => {
  it('builds a basic plural message with other only', () => {
    expect(buildICUPluralMessage({ other: '# items' }))
      .toBe('{count, plural, other {# items}}')
  })

  it('maps zero to =0 exact match', () => {
    expect(buildICUPluralMessage({ zero: 'No items', one: '# item', other: '# items' }))
      .toBe('{count, plural, =0 {No items} one {# item} other {# items}}')
  })

  it('includes all provided categories in order', () => {
    const result = buildICUPluralMessage({
      zero: 'none',
      one: 'single',
      two: 'pair',
      few: 'several',
      many: 'lots',
      other: 'default',
    })
    expect(result).toBe('{count, plural, =0 {none} one {single} two {pair} few {several} many {lots} other {default}}')
  })

  it('skips undefined categories', () => {
    expect(buildICUPluralMessage({ one: '# item', other: '# items' }))
      .toBe('{count, plural, one {# item} other {# items}}')
  })

  it('includes offset prefix when provided', () => {
    expect(buildICUPluralMessage({ other: '# others' }, 1))
      .toBe('{count, plural, offset:1 other {# others}}')
  })

  it('omits offset prefix when offset is 0', () => {
    expect(buildICUPluralMessage({ other: '# items' }, 0))
      .toBe('{count, plural, other {# items}}')
  })
})

describe('buildICUSelectMessage', () => {
  it('builds a basic select message', () => {
    expect(buildICUSelectMessage({ male: 'He', female: 'She', other: 'They' }))
      .toBe('{value, select, male {He} female {She} other {They}}')
  })

  it('handles single option with other', () => {
    expect(buildICUSelectMessage({ other: 'default' }))
      .toBe('{value, select, other {default}}')
  })

  it('filters out undefined values', () => {
    const forms: Record<string, string> = { a: 'A', b: undefined as unknown as string, other: 'X' }
    const result = buildICUSelectMessage(forms)
    expect(result).not.toContain('b')
  })
})

describe('normalizeSelectForms', () => {
  it('passes through alphanumeric keys unchanged', () => {
    const { forms, valueMap } = normalizeSelectForms({ male: 'He', female: 'She', other: 'They' })
    expect(forms).toEqual({ male: 'He', female: 'She', other: 'They' })
    expect(valueMap).toEqual({ male: 'male', female: 'female' })
  })

  it('replaces non-alphanumeric keys with safe identifiers', () => {
    const { forms, valueMap } = normalizeSelectForms({ 'key-1': 'A', 'key.2': 'B', other: 'C' })
    expect(forms).toEqual({ case_0: 'A', case_1: 'B', other: 'C' })
    expect(valueMap).toEqual({ 'key-1': 'case_0', 'key.2': 'case_1' })
  })

  it('ensures other exists even if not provided', () => {
    const { forms } = normalizeSelectForms({ a: 'A' })
    expect(forms['other']).toBe('')
  })

  it('preserves other when provided', () => {
    const { forms } = normalizeSelectForms({ other: 'default' })
    expect(forms['other']).toBe('default')
  })

  it('does not include other in valueMap', () => {
    const { valueMap } = normalizeSelectForms({ a: 'A', other: 'B' })
    expect(valueMap).not.toHaveProperty('other')
  })
})

describe('offsetIndices', () => {
  it('returns message unchanged when offset is 0', () => {
    expect(offsetIndices('<0>hello</0>', 0)).toBe('<0>hello</0>')
  })

  it('offsets opening and closing tags', () => {
    expect(offsetIndices('<0>hello</0>', 2)).toBe('<2>hello</2>')
  })

  it('offsets self-closing tags', () => {
    expect(offsetIndices('<0/>', 3)).toBe('<3/>')
  })

  it('offsets multiple tags', () => {
    expect(offsetIndices('text <0>a</0> and <1>b</1>', 5))
      .toBe('text <5>a</5> and <6>b</6>')
  })

  it('handles nested tags', () => {
    expect(offsetIndices('<0><1>nested</1></0>', 1))
      .toBe('<1><2>nested</2></1>')
  })

  it('handles tags with > suffix', () => {
    expect(offsetIndices('<0>content</0>', 1)).toBe('<1>content</1>')
  })
})
