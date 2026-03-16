import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser'
import { compile } from '../src/compile'
import type { ASTNode } from '../src/types'

describe('compile', () => {
  it('returns string for single text node', () => {
    const ast = parse('Hello World')
    const result = compile(ast)
    expect(result).toBe('Hello World')
    expect(typeof result).toBe('string')
  })

  it('returns string for multiple text nodes', () => {
    const ast = parse("it''s fine")
    const result = compile(ast)
    expect(typeof result).toBe('string')
  })

  it('returns function for variable interpolation', () => {
    const ast = parse('Hello {name}')
    const fn = compile(ast)
    expect(typeof fn).toBe('function')
    expect((fn as Function)({ name: 'World' })).toBe('Hello World')
  })

  it('shows placeholder for missing variable', () => {
    const ast = parse('Hello {name}')
    const fn = compile(ast) as Function
    expect(fn({})).toBe('Hello {name}')
  })

  it('handles plural with exact match', () => {
    const ast = parse('{count, plural, =0 {none} one {# item} other {# items}}')
    const fn = compile(ast, 'en') as Function
    expect(fn({ count: 0 })).toBe('none')
    expect(fn({ count: 1 })).toBe('1 item')
    expect(fn({ count: 5 })).toBe('5 items')
  })

  it('handles plural with offset', () => {
    const ast = parse('{count, plural, offset:1 =0 {nobody} =1 {just {name}} one {# other and {name}} other {# others and {name}}}')
    const fn = compile(ast, 'en') as Function
    expect(fn({ count: 0, name: 'Alice' })).toBe('nobody')
    expect(fn({ count: 1, name: 'Alice' })).toBe('just Alice')
    expect(fn({ count: 2, name: 'Alice' })).toBe('1 other and Alice')
  })

  it('handles select', () => {
    const ast = parse('{gender, select, male {He} female {She} other {They}}')
    const fn = compile(ast, 'en') as Function
    expect(fn({ gender: 'male' })).toBe('He')
    expect(fn({ gender: 'female' })).toBe('She')
    expect(fn({ gender: 'unknown' })).toBe('They')
  })

  it('handles number function', () => {
    const ast = parse('{amount, number}')
    const fn = compile(ast, 'en') as Function
    const result = fn({ amount: 1234.5 })
    expect(result).toContain('1')
    expect(result).toContain('234')
  })

  it('handles date function', () => {
    const ast = parse('{d, date}')
    const fn = compile(ast, 'en') as Function
    const result = fn({ d: new Date(2024, 0, 15) })
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('handles nested plural + variable', () => {
    const ast = parse('{count, plural, one {# msg from {name}} other {# msgs from {name}}}')
    const fn = compile(ast, 'en') as Function
    expect(fn({ count: 1, name: 'Alice' })).toBe('1 msg from Alice')
    expect(fn({ count: 3, name: 'Bob' })).toBe('3 msgs from Bob')
  })

  // Multi-locale plural tests
  it('handles Arabic plurals (6 forms)', () => {
    const ast = parse('{count, plural, zero {0} one {1} two {2} few {few} many {many} other {other}}')
    const fn = compile(ast, 'ar') as Function
    expect(fn({ count: 0 })).toBe('0')
    expect(fn({ count: 1 })).toBe('1')
    expect(fn({ count: 2 })).toBe('2')
  })

  it('handles Russian plurals', () => {
    const ast = parse('{count, plural, one {# штука} few {# штуки} many {# штук} other {# штук}}')
    const fn = compile(ast, 'ru') as Function
    expect(fn({ count: 1 })).toBe('1 штука')
    expect(fn({ count: 3 })).toBe('3 штуки')
    expect(fn({ count: 5 })).toBe('5 штук')
    expect(fn({ count: 21 })).toBe('21 штука')
  })

  it('handles Chinese (no plural forms except other)', () => {
    const ast = parse('{count, plural, other {# 件}}')
    const fn = compile(ast, 'zh') as Function
    expect(fn({ count: 1 })).toBe('1 件')
    expect(fn({ count: 100 })).toBe('100 件')
  })

  it('handles number function with currency style', () => {
    const ast = parse('{amount, number, currency}')
    const fn = compile(ast, 'en-US') as Function
    const result = fn({ amount: 42.5 })
    expect(result).toContain('42')
  })

  it('handles number function with percent style', () => {
    const ast = parse('{rate, number, percent}')
    const fn = compile(ast, 'en') as Function
    const result = fn({ rate: 0.85 })
    expect(result).toContain('85')
    expect(result).toContain('%')
  })

  it('handles deeply nested select inside plural', () => {
    const ast = parse('{count, plural, one {{gender, select, male {He has # item} other {They have # item}}} other {{gender, select, male {He has # items} other {They have # items}}}}')
    const fn = compile(ast, 'en') as Function
    expect(fn({ count: 1, gender: 'male' })).toBe('He has 1 item')
    expect(fn({ count: 3, gender: 'other' })).toBe('They have 3 items')
  })

  it('handles number function with a custom style (not currency/percent)', () => {
    const ast = parse('{amount, number, decimal}')
    const fn = compile(ast, 'en') as Function
    const result = fn({ amount: 1234.5 })
    expect(result).toContain('1')
    expect(result).toContain('234')
  })

  it('handles date function with long style', () => {
    const ast = parse('{d, date, long}')
    const fn = compile(ast, 'en') as Function
    const result = fn({ d: new Date(2024, 0, 15) })
    expect(typeof result).toBe('string')
    expect(result).toContain('2024')
    expect(result).toContain('January')
  })

  it('handles date function with full style', () => {
    const ast = parse('{d, date, full}')
    const fn = compile(ast, 'en') as Function
    const result = fn({ d: new Date(2024, 0, 15) })
    expect(typeof result).toBe('string')
    expect(result).toContain('2024')
    expect(result).toContain('January')
  })

  it('handles time function with default style', () => {
    const ast = parse('{d, time}')
    const fn = compile(ast, 'en') as Function
    const result = fn({ d: new Date(2024, 0, 15, 14, 30, 0) })
    expect(typeof result).toBe('string')
    expect(result).toBeTruthy()
  })

  it('handles time function with short style', () => {
    const ast = parse('{d, time, short}')
    const fn = compile(ast, 'en') as Function
    const result = fn({ d: new Date(2024, 0, 15, 14, 30, 0) })
    expect(typeof result).toBe('string')
    expect(result).toBeTruthy()
  })

  it('handles time function with long style', () => {
    const ast = parse('{d, time, long}')
    const fn = compile(ast, 'en') as Function
    const result = fn({ d: new Date(2024, 0, 15, 14, 30, 0) })
    expect(typeof result).toBe('string')
    expect(result).toBeTruthy()
  })

  it('handles unknown function type by returning placeholder for missing', () => {
    const ast = parse('{x, customfn}')
    const fn = compile(ast, 'en') as Function
    expect(fn({ x: 'hello' })).toBe('hello')
    expect(fn({ x: 42 })).toBe('42')
    expect(fn({})).toBe('{x}')
  })

  // ─── Function node edge cases ─────────────────────────────────────────

  describe('function node edge cases', () => {
    it('shows placeholder when number function variable is missing', () => {
      const ast = parse('{amount, number}')
      const fn = compile(ast, 'en') as Function
      expect(fn({})).toBe('{amount}')
    })

    it('shows placeholder when date function variable is missing', () => {
      const ast = parse('{d, date}')
      const fn = compile(ast, 'en') as Function
      expect(fn({})).toBe('{d}')
    })

    it('shows placeholder when time function variable is missing', () => {
      const ast = parse('{d, time}')
      const fn = compile(ast, 'en') as Function
      expect(fn({})).toBe('{d}')
    })

    it('handles invalid date in date function without throwing', () => {
      const ast = parse('{d, date}')
      const fn = compile(ast, 'en') as Function
      const result = fn({ d: 'not-a-date' })
      expect(typeof result).toBe('string')
    })

    it('handles NaN in number function', () => {
      const ast = parse('{n, number}')
      const fn = compile(ast, 'en') as Function
      const result = fn({ n: NaN })
      expect(result).toBe('NaN')
    })
  })

  // ─── Edge cases — exhaustive ─────────────────────────────────────────

  describe('edge cases - exhaustive', () => {
    it('empty AST returns empty string', () => {
      const result = compile([])
      expect(result).toBe('')
      expect(typeof result).toBe('string')
    })

    it('values undefined/null preserves placeholder', () => {
      const ast = parse('{name}')
      const fn = compile(ast) as Function
      expect(fn(undefined)).toBe('{name}')
      expect(fn(null)).toBe('{name}')
    })

    it('no locale defaults to en', () => {
      const ast = parse('{count, plural, one {one} other {other}}')
      const fn = compile(ast) as Function
      expect(fn({ count: 1 })).toBe('one')
      expect(fn({ count: 2 })).toBe('other')
    })

    it('plural variable as string "3" (type coercion)', () => {
      const ast = parse('{count, plural, one {# item} other {# items}}')
      const fn = compile(ast, 'en') as Function
      expect(fn({ count: '3' })).toBe('3 items')
    })

    it('plural variable as NaN', () => {
      const ast = parse('{count, plural, one {# item} other {# items}}')
      const fn = compile(ast, 'en') as Function
      const result = fn({ count: NaN })
      expect(result).toBe('NaN items')
    })

    it('plural variable as negative number', () => {
      const ast = parse('{count, plural, one {# item} other {# items}}')
      const fn = compile(ast, 'en') as Function
      expect(fn({ count: -5 })).toBe('-5 items')
    })

    it('plural variable as Infinity', () => {
      const ast = parse('{count, plural, one {# item} other {# items}}')
      const fn = compile(ast, 'en') as Function
      const result = fn({ count: Infinity })
      expect(result).toBe('Infinity items')
    })

    it('plural variable as float 1.5', () => {
      const ast = parse('{count, plural, one {# item} other {# items}}')
      const fn = compile(ast, 'en') as Function
      expect(fn({ count: 1.5 })).toBe('1.5 items')
    })

    it('select variable undefined falls back to other', () => {
      const ast = parse('{gender, select, male {He} female {She} other {They}}')
      const fn = compile(ast, 'en') as Function
      expect(fn({})).toBe('They')
    })

    it('select variable null falls back to other', () => {
      const ast = parse('{gender, select, male {He} female {She} other {They}}')
      const fn = compile(ast, 'en') as Function
      expect(fn({ gender: null })).toBe('They')
    })

    it('select no match and no other returns empty string', () => {
      const ast: ASTNode[] = [{
        type: 'select',
        variable: 'x',
        options: { a: [{ type: 'text', value: 'A' }] },
      }]
      const fn = compile(ast, 'en') as Function
      expect(fn({ x: 'z' })).toBe('')
    })

    it('date function with timestamp (not Date object)', () => {
      const ast = parse('{d, date}')
      const fn = compile(ast, 'en') as Function
      // Use a known timestamp: 2024-01-15T00:00:00.000Z
      const ts = new Date(2024, 0, 15).getTime()
      const result = fn({ d: ts })
      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })

    it('number function with convertible string', () => {
      const ast = parse('{n, number}')
      const fn = compile(ast, 'en') as Function
      const result = fn({ n: '1234.5' })
      expect(result).toContain('1')
      expect(result).toContain('234')
    })

    it('same message with multiple plural nodes', () => {
      const ast = parse('{a, plural, one {# apple} other {# apples}} and {b, plural, one {# banana} other {# bananas}}')
      const fn = compile(ast, 'en') as Function
      expect(fn({ a: 1, b: 2 })).toBe('1 apple and 2 bananas')
      expect(fn({ a: 3, b: 1 })).toBe('3 apples and 1 banana')
    })

    it('message with both select and plural', () => {
      const ast = parse('{gender, select, male {He has {count, plural, one {# item} other {# items}}} other {They have {count, plural, one {# item} other {# items}}}}')
      const fn = compile(ast, 'en') as Function
      expect(fn({ gender: 'male', count: 1 })).toBe('He has 1 item')
      expect(fn({ gender: 'other', count: 5 })).toBe('They have 5 items')
    })

    it('number with Infinity / -Infinity', () => {
      const ast = parse('{n, number}')
      const fn = compile(ast, 'en') as Function
      const posResult = fn({ n: Infinity })
      expect(posResult).toContain('∞')
      const negResult = fn({ n: -Infinity })
      expect(negResult).toContain('∞')
    })

    it('date with epoch 0', () => {
      const ast = parse('{d, date}')
      const fn = compile(ast, 'en') as Function
      const result = fn({ d: 0 })
      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })

    it('number with Number.MAX_SAFE_INTEGER', () => {
      const ast = parse('{n, number}')
      const fn = compile(ast, 'en') as Function
      const result = fn({ n: Number.MAX_SAFE_INTEGER })
      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })

    it('selectordinal with offset', () => {
      const ast: ASTNode[] = [{
        type: 'plural',
        variable: 'n',
        offset: 1,
        ordinal: true,
        options: {
          one: [{ type: 'variable', name: '#' }, { type: 'text', value: 'st' }],
          two: [{ type: 'variable', name: '#' }, { type: 'text', value: 'nd' }],
          few: [{ type: 'variable', name: '#' }, { type: 'text', value: 'rd' }],
          other: [{ type: 'variable', name: '#' }, { type: 'text', value: 'th' }],
        },
      }]
      const fn = compile(ast, 'en') as Function
      // n=2, offset=1 → adjustedCount=1 → ordinal 'one' → "1st"
      expect(fn({ n: 2 })).toBe('1st')
      // n=4, offset=1 → adjustedCount=3 → ordinal 'few' → "3rd"
      expect(fn({ n: 4 })).toBe('3rd')
    })

    it('selectordinal non-English locale', () => {
      // In Welsh (cy), ordinal rules differ from English
      // We just verify it doesn't crash and produces output
      const ast = parse('{n, selectordinal, other {#th}}')
      const fn = compile(ast, 'ja') as Function
      expect(fn({ n: 3 })).toBe('3th')
    })
  })

  // ─── Selectordinal in compile ─────────────────────────────────────────

  describe('selectordinal compilation', () => {
    it('uses ordinal rules for selectordinal', () => {
      const ast = parse('{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}')
      const fn = compile(ast, 'en') as Function
      expect(fn({ n: 1 })).toBe('1st')
      expect(fn({ n: 2 })).toBe('2nd')
      expect(fn({ n: 3 })).toBe('3rd')
      expect(fn({ n: 4 })).toBe('4th')
      expect(fn({ n: 11 })).toBe('11th')
      expect(fn({ n: 12 })).toBe('12th')
      expect(fn({ n: 13 })).toBe('13th')
      expect(fn({ n: 21 })).toBe('21st')
      expect(fn({ n: 22 })).toBe('22nd')
      expect(fn({ n: 23 })).toBe('23rd')
    })
  })
})

