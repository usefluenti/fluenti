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
    expect(result[0]!.type).toBe('plural')
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
    expect(result[0]!.type).toBe('select')
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

  // ─── Exhaustive edge cases ───────────────────────────────────────────

  describe('edge cases - exhaustive', () => {
    it('1. variable name with underscores', () => {
      expect(parse('{my_var}')).toEqual([
        { type: 'variable', name: 'my_var' },
      ])
    })

    it('2. variable name with numbers', () => {
      expect(parse('{var123}')).toEqual([
        { type: 'variable', name: 'var123' },
      ])
    })

    it('3. consecutive variables without separator', () => {
      expect(parse('{a}{b}')).toEqual([
        { type: 'variable', name: 'a' },
        { type: 'variable', name: 'b' },
      ])
    })

    it('4. very long message (10k+ characters)', () => {
      let longText = ''
      for (let i = 0; i < 10_001; i++) longText += 'a'
      const result = parse(longText)
      expect(result).toEqual([{ type: 'text', value: longText }])
    })

    it('5. message containing only a variable', () => {
      expect(parse('{name}')).toEqual([
        { type: 'variable', name: 'name' },
      ])
    })

    it('6. message with only whitespace (spaces, tab, newline)', () => {
      const ws = '  \t\n'
      expect(parse(ws)).toEqual([{ type: 'text', value: ws }])
    })

    it('7. unicode messages (CJK, Arabic, emoji)', () => {
      const msg = '你好 {name}، مرحبا 🎉'
      const result = parse(msg)
      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ type: 'text', value: '你好 ' })
      expect(result[1]).toEqual({ type: 'variable', name: 'name' })
      expect(result[2]).toEqual({ type: 'text', value: '، مرحبا 🎉' })
    })

    it('8. zero-width characters U+200B and U+FEFF', () => {
      const msg = '\u200Bhello\uFEFF'
      const result = parse(msg)
      expect(result).toEqual([{ type: 'text', value: '\u200Bhello\uFEFF' }])
    })

    it('9. quoted sequence preserves inner text', () => {
      const result = parse("'hello world'")
      expect(result).toEqual([{ type: 'text', value: 'hello world' }])
    })

    it('10. unterminated quote at end consumes remaining text', () => {
      const result = parse("text 'unterminated")
      expect(result).toEqual([
        { type: 'text', value: 'text ' },
        { type: 'text', value: 'unterminated' },
      ])
    })

    it('11. spaces around commas in function call', () => {
      const result = parse('{ amount , number , currency }')
      expect(result).toEqual([
        { type: 'function', variable: 'amount', fn: 'number', style: 'currency' },
      ])
    })

    it('12. plural with =2 and =3 exact matches', () => {
      const result = parse('{n, plural, =2 {pair} =3 {triple} other {many}}')
      const node = result[0] as any
      expect(node.type).toBe('plural')
      expect(node.options['=2']).toEqual([{ type: 'text', value: 'pair' }])
      expect(node.options['=3']).toEqual([{ type: 'text', value: 'triple' }])
      expect(node.options['other']).toBeDefined()
    })

    it('13. plural with all 6 CLDR categories', () => {
      const result = parse('{n, plural, zero {z} one {o} two {t} few {f} many {m} other {x}}')
      const node = result[0] as any
      expect(Object.keys(node.options)).toEqual(['zero', 'one', 'two', 'few', 'many', 'other'])
    })

    it('14. plural missing other branch throws error', () => {
      expect(() => parse('{n, plural, one {item}}')).toThrow(FluentParseError)
      expect(() => parse('{n, plural, one {item}}')).toThrow("'other'")
    })

    it('15. select missing other branch throws error', () => {
      expect(() => parse('{g, select, male {he}}')).toThrow(FluentParseError)
      expect(() => parse('{g, select, male {he}}')).toThrow("'other'")
    })

    it('16. empty variable name throws error', () => {
      expect(() => parse('{}')).toThrow(FluentParseError)
      expect(() => parse('{}')).toThrow('Expected identifier')
    })

    it('17. time function with style', () => {
      const result = parse('{d, time, short}')
      expect(result).toEqual([
        { type: 'function', variable: 'd', fn: 'time', style: 'short' },
      ])
    })

    it('18. nested plural inside plural', () => {
      const msg = '{a, plural, one {{b, plural, one {1-1} other {1-N}}} other {{b, plural, one {N-1} other {N-N}}}}'
      const result = parse(msg)
      expect(result).toHaveLength(1)
      const outer = result[0] as any
      expect(outer.type).toBe('plural')
      const innerOne = outer.options.one[0]
      expect(innerOne.type).toBe('plural')
      expect(innerOne.variable).toBe('b')
      expect(innerOne.options.one).toEqual([{ type: 'text', value: '1-1' }])
      const innerOther = outer.options.other[0]
      expect(innerOther.type).toBe('plural')
      expect(innerOther.options.other).toEqual([{ type: 'text', value: 'N-N' }])
    })

    it('19. only escape characters', () => {
      // '' produces literal ', '{' produces literal {, '}' produces literal }
      const result = parse("'''{''}''")
      // '' -> '  then '{' -> {  then '' -> '  then } consumed, then '' -> '
      // Let's just verify it parses without error and produces text nodes
      expect(result.every(n => n.type === 'text')).toBe(true)
      const text = result.map(n => (n as any).value).join('')
      expect(text).toContain("'")
      expect(text).toContain('{')
    })

    it('20. selectordinal with English ordinal categories', () => {
      const result = parse('{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}')
      const node = result[0] as any
      expect(node.ordinal).toBe(true)
      expect(Object.keys(node.options)).toEqual(['one', 'two', 'few', 'other'])
      // Verify # is parsed as variable inside ordinal branches
      expect(node.options.one[0]).toEqual({ type: 'variable', name: '#' })
    })

    it('21. selectordinal with nested variable', () => {
      const result = parse('{n, selectordinal, one {#st place for {name}} other {#th place for {name}}}')
      const node = result[0] as any
      expect(node.ordinal).toBe(true)
      expect(node.options.one).toHaveLength(3)
      expect(node.options.one[0]).toEqual({ type: 'variable', name: '#' })
      expect(node.options.one[2]).toEqual({ type: 'variable', name: 'name' })
    })

    it('22. 4-level nesting: plural > select > plural > select', () => {
      const msg = '{a, plural, one {{g, select, male {{b, plural, one {{t, select, x {deep} other {end}}} other {b-other}}} other {g-other}}} other {a-other}}'
      const result = parse(msg)
      expect(result).toHaveLength(1)
      const level1 = result[0] as any
      expect(level1.type).toBe('plural')
      const level2 = level1.options.one[0]
      expect(level2.type).toBe('select')
      const level3 = level2.options.male[0]
      expect(level3.type).toBe('plural')
      const level4 = level3.options.one[0]
      expect(level4.type).toBe('select')
      expect(level4.options.x).toEqual([{ type: 'text', value: 'deep' }])
    })

    it('23. message with 10+ variables', () => {
      const msg = '{v1} {v2} {v3} {v4} {v5} {v6} {v7} {v8} {v9} {v10} {v11}'
      const result = parse(msg)
      const variables = result.filter(n => n.type === 'variable')
      expect(variables).toHaveLength(11)
      expect((variables[0] as any).name).toBe('v1')
      expect((variables[10] as any).name).toBe('v11')
    })

    it('24. plural with 10+ exact matches =0 through =10', () => {
      const branches = new Array(11).fill().map((_, i) => `=${i} {val${i}}`).join(' ')
      const msg = `{n, plural, ${branches} other {default}}`
      const result = parse(msg)
      const node = result[0] as any
      expect(node.type).toBe('plural')
      for (let i = 0; i <= 10; i++) {
        expect(node.options[`=${i}`]).toEqual([{ type: 'text', value: `val${i}` }])
      }
      expect(node.options['other']).toEqual([{ type: 'text', value: 'default' }])
    })

    it('25. empty message string returns empty array', () => {
      expect(parse('')).toEqual([])
    })
  })

  // ─── Recursion depth limit ─────────────────────────────────────────
  describe('recursion depth limit', () => {
    /** Build a deeply nested select message with the given number of nesting levels. */
    function buildNestedSelect(levels: number): string {
      const vars = 'abcdefghijklmnopqrstuvwxyz'
      let msg = ''
      for (let i = 0; i < levels; i++) {
        const v = vars[i % vars.length]! + (i >= vars.length ? String(i) : '')
        msg += `{${v}, select, other {`
      }
      msg += 'leaf'
      for (let i = 0; i < levels; i++) {
        msg += '}}'
      }
      return msg
    }

    it('allows 10 levels of nesting', () => {
      const msg = buildNestedSelect(10)
      expect(() => parse(msg)).not.toThrow()
    })

    it('throws FluentParseError at 11 levels of nesting', () => {
      const msg = buildNestedSelect(11)
      expect(() => parse(msg)).toThrow(FluentParseError)
      expect(() => parse(msg)).toThrow(/maximum nesting depth/i)
    })

    it('throws FluentParseError at 20 levels of nesting', () => {
      const msg = buildNestedSelect(20)
      expect(() => parse(msg)).toThrow(FluentParseError)
    })
  })
})
