import { describe, it, expect } from 'vitest'
import { parse, FluentParseError } from '../src/parser'

describe('parse', () => {
  it('parses plain text', () => {
    expect(parse('Hello World')).toEqual([
      { type: 'text', value: 'Hello World' },
    ])
  })

  it('parses empty string', () => {
    expect(parse('')).toEqual([])
  })

  it('parses simple variable', () => {
    expect(parse('Hello {name}')).toEqual([
      { type: 'text', value: 'Hello ' },
      { type: 'variable', name: 'name' },
    ])
  })

  it('parses multiple variables', () => {
    expect(parse('{first} and {second}')).toEqual([
      { type: 'variable', name: 'first' },
      { type: 'text', value: ' and ' },
      { type: 'variable', name: 'second' },
    ])
  })

  it('parses plural node', () => {
    const result = parse('{count, plural, =0 {none} one {# item} other {# items}}')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('plural')
    const plural = result[0] as any
    expect(plural.variable).toBe('count')
    expect(Object.keys(plural.options)).toEqual(['=0', 'one', 'other'])
  })

  it('parses plural with offset', () => {
    const result = parse('{count, plural, offset:1 one {# item} other {# items}}')
    expect(result).toHaveLength(1)
    const plural = result[0] as any
    expect(plural.offset).toBe(1)
  })

  it('parses select node', () => {
    const result = parse('{gender, select, male {He} female {She} other {They}}')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('select')
    const select = result[0] as any
    expect(select.variable).toBe('gender')
    expect(Object.keys(select.options)).toEqual(['male', 'female', 'other'])
  })

  it('parses function node without style', () => {
    const result = parse('{amount, number}')
    expect(result).toEqual([
      { type: 'function', variable: 'amount', fn: 'number' },
    ])
  })

  it('parses function node with style', () => {
    const result = parse('{amount, number, currency}')
    expect(result).toEqual([
      { type: 'function', variable: 'amount', fn: 'number', style: 'currency' },
    ])
  })

  it('parses date function', () => {
    const result = parse('{d, date, short}')
    expect(result).toEqual([
      { type: 'function', variable: 'd', fn: 'date', style: 'short' },
    ])
  })

  it('parses nested messages', () => {
    const msg = '{count, plural, one {# msg from {name}} other {# msgs from {name}}}'
    const result = parse(msg)
    expect(result).toHaveLength(1)
    const plural = result[0] as any
    expect(plural.options.one).toHaveLength(3)
    expect(plural.options.one[2]).toEqual({ type: 'variable', name: 'name' })
  })

  it('parses escaped opening brace', () => {
    const result = parse("'{'")
    expect(result).toEqual([{ type: 'text', value: '{' }])
  })

  it('parses escaped closing brace', () => {
    const result = parse("'}'")
    expect(result).toEqual([{ type: 'text', value: '}' }])
  })

  it('parses double single quote as literal quote', () => {
    const result = parse("it''s")
    expect(result).toEqual([
      { type: 'text', value: 'it' },
      { type: 'text', value: "'" },
      { type: 'text', value: 's' },
    ])
  })

  it('parses # inside plural branches', () => {
    const result = parse('{n, plural, one {# item} other {# items}}')
    const plural = result[0] as any
    expect(plural.options.one[0]).toEqual({ type: 'variable', name: '#' })
  })

  it('throws FluentParseError on unclosed brace', () => {
    expect(() => parse('{name')).toThrow(FluentParseError)
  })

  it('throws FluentParseError with offset and source', () => {
    try {
      parse('{count, plural, one missing_brace}')
      expect.fail('Should have thrown')
    } catch (e: any) {
      expect(e).toBeInstanceOf(FluentParseError)
      expect(e.offset).toBeGreaterThan(0)
      expect(e.source).toBe('{count, plural, one missing_brace}')
    }
  })

  it('parses text with variable at start', () => {
    expect(parse('{x}!')).toEqual([
      { type: 'variable', name: 'x' },
      { type: 'text', value: '!' },
    ])
  })

  it('parses complex nested select inside plural', () => {
    const msg = '{count, plural, one {{gender, select, male {He has # item} other {They have # item}}} other {{gender, select, male {He has # items} other {They have # items}}}}'
    const result = parse(msg)
    expect(result).toHaveLength(1)
    const plural = result[0] as any
    expect(plural.options.one[0].type).toBe('select')
  })

  it('throws on unexpected character after variable name (not } or ,)', () => {
    expect(() => parse('{name !}')).toThrow(FluentParseError)
    expect(() => parse('{name !}')).toThrow('Unexpected character')
  })

  it('throws on missing closing } for plural/select option body', () => {
    expect(() => parse('{count, plural, one {item')).toThrow(FluentParseError)
    expect(() => parse('{count, plural, one {item')).toThrow('Expected closing }')
  })

  it('throws on missing closing } for outer plural/select', () => {
    expect(() => parse('{count, plural, other {items}')).toThrow(FluentParseError)
    expect(() => parse('{count, plural, other {items}')).toThrow('Expected closing }')
  })

  it('throws on missing closing } for function expression', () => {
    expect(() => parse('{amount, number')).toThrow(FluentParseError)
    expect(() => parse('{amount, number')).toThrow('Expected closing }')
  })

  // ─── selectordinal ────────────────────────────────────────────────────

  describe('selectordinal', () => {
    it('parses basic selectordinal structure with ordinal flag', () => {
      const result = parse('{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}')
      expect(result).toHaveLength(1)
      expect(result[0]!.type).toBe('plural')
      const node = result[0] as any
      expect(node.variable).toBe('n')
      expect(node.ordinal).toBe(true)
      expect(Object.keys(node.options)).toEqual(['one', 'two', 'few', 'other'])
    })

    it('parses selectordinal with offset', () => {
      const result = parse('{n, selectordinal, offset:1 one {#st} other {#th}}')
      const node = result[0] as any
      expect(node.offset).toBe(1)
      expect(node.ordinal).toBe(true)
    })

    it('parses selectordinal with exact and category branches', () => {
      const result = parse('{n, selectordinal, =1 {first} one {#st} two {#nd} few {#rd} other {#th}}')
      const node = result[0] as any
      expect(node.options['=1']).toBeDefined()
      expect(node.options['one']).toBeDefined()
      expect(node.options['other']).toBeDefined()
    })

    it('selectordinal requires other branch', () => {
      expect(() => parse('{n, selectordinal, one {#st}}')).toThrow(FluentParseError)
    })

    it('regular plural does not have ordinal flag', () => {
      const result = parse('{n, plural, one {# item} other {# items}}')
      const node = result[0] as any
      expect(node.ordinal).toBeUndefined()
    })
  })

  // ─── Deep nesting and empty branches ──────────────────────────────────

  describe('deep nesting and empty branches', () => {
    it('parses 3-level nesting: plural → select → plural', () => {
      const msg = '{count, plural, one {{gender, select, male {{n, plural, one {he has # item} other {he has # items}}} other {{n, plural, one {they have # item} other {they have # items}}}}} other {many}}'
      const result = parse(msg)
      expect(result).toHaveLength(1)
      const outer = result[0] as any
      expect(outer.type).toBe('plural')
      const inner = outer.options.one[0]
      expect(inner.type).toBe('select')
    })

    it('parses empty plural branch', () => {
      const result = parse('{n, plural, one {} other {items}}')
      const node = result[0] as any
      expect(node.options.one).toEqual([])
      expect(node.options.other).toHaveLength(1)
    })

    it('parses empty select branch', () => {
      const result = parse('{g, select, male {} other {person}}')
      const node = result[0] as any
      expect(node.options.male).toEqual([])
      expect(node.options.other).toHaveLength(1)
    })

    it('parses plural with only other', () => {
      const result = parse('{n, plural, other {items}}')
      const node = result[0] as any
      expect(Object.keys(node.options)).toEqual(['other'])
    })

    it('parses select with only other', () => {
      const result = parse('{g, select, other {person}}')
      const node = result[0] as any
      expect(Object.keys(node.options)).toEqual(['other'])
    })

    it('parses message with 5 variables', () => {
      const result = parse('{a} {b} {c} {d} {e}')
      const variables = result.filter(n => n.type === 'variable')
      expect(variables).toHaveLength(5)
    })
  })
})
