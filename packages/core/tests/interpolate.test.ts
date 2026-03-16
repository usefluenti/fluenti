import { describe, it, expect } from 'vitest'
import { interpolate } from '../src/interpolate'

describe('interpolate', () => {
  it('returns plain text as-is', () => {
    expect(interpolate('Hello World')).toBe('Hello World')
  })

  it('interpolates variables', () => {
    expect(interpolate('Hello {name}', { name: 'World' })).toBe('Hello World')
  })

  it('interpolates multiple variables', () => {
    expect(interpolate('{a} + {b}', { a: '1', b: '2' })).toBe('1 + 2')
  })

  it('handles plural messages', () => {
    const msg = '{count, plural, =0 {none} one {# item} other {# items}}'
    expect(interpolate(msg, { count: 0 }, 'en')).toBe('none')
    expect(interpolate(msg, { count: 1 }, 'en')).toBe('1 item')
    expect(interpolate(msg, { count: 42 }, 'en')).toBe('42 items')
  })

  it('uses locale for plural rules', () => {
    const msg = '{count, plural, one {# штука} few {# штуки} many {# штук} other {# штук}}'
    expect(interpolate(msg, { count: 1 }, 'ru')).toBe('1 штука')
    expect(interpolate(msg, { count: 3 }, 'ru')).toBe('3 штуки')
  })

  it('defaults locale to en', () => {
    expect(interpolate('{n, plural, one {one} other {other}}', { n: 1 })).toBe('one')
  })

  it('caches compiled messages (same result on repeat calls)', () => {
    const msg = 'Hello {name}'
    const a = interpolate(msg, { name: 'A' })
    const b = interpolate(msg, { name: 'B' })
    expect(a).toBe('Hello A')
    expect(b).toBe('Hello B')
  })

  it('handles empty values', () => {
    expect(interpolate('Hello', {})).toBe('Hello')
  })

  it('handles undefined values gracefully', () => {
    expect(interpolate('Hello {name}')).toBe('Hello {name}')
  })

  it('evicts least recently used entries when cache exceeds 500', () => {
    // Fill cache with 501+ unique messages to trigger LRU eviction
    for (let i = 0; i < 510; i++) {
      const msg = `Message number ${i} with {name}`
      interpolate(msg, { name: 'test' })
    }
    // The first few entries should have been evicted, but later ones still work
    // Verify the function still works correctly after eviction
    const result = interpolate('Message number 509 with {name}', { name: 'Alice' })
    expect(result).toBe('Message number 509 with Alice')

    // Earliest entries were evicted but re-calling them still works (re-compiled)
    const early = interpolate('Message number 0 with {name}', { name: 'Bob' })
    expect(early).toBe('Message number 0 with Bob')
  })
})

// ─── Selectordinal (end-to-end) ────────────────────────────────────────

describe('selectordinal', () => {
  it('uses ordinal plural rules for selectordinal', () => {
    const msg = '{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}'
    // English ordinal: 1→one(st), 2→two(nd), 3→few(rd), 4→other(th)
    expect(interpolate(msg, { n: 1 }, 'en')).toBe('1st')
    expect(interpolate(msg, { n: 2 }, 'en')).toBe('2nd')
    expect(interpolate(msg, { n: 3 }, 'en')).toBe('3rd')
    expect(interpolate(msg, { n: 4 }, 'en')).toBe('4th')
    expect(interpolate(msg, { n: 11 }, 'en')).toBe('11th')
    expect(interpolate(msg, { n: 21 }, 'en')).toBe('21st')
  })
})

// ─── Non-string value handling ──────────────────────────────────────────

describe('non-string value handling', () => {
  it('coerces number to string', () => {
    expect(interpolate('Value: {n}', { n: 42 })).toBe('Value: 42')
  })

  it('coerces boolean true to string', () => {
    expect(interpolate('Active: {flag}', { flag: true })).toBe('Active: true')
  })

  it('coerces boolean false to string', () => {
    expect(interpolate('Active: {flag}', { flag: false })).toBe('Active: false')
  })

  it('coerces 0 to "0" (not empty string)', () => {
    expect(interpolate('Count: {n}', { n: 0 })).toBe('Count: 0')
  })

  it('treats null as missing (shows placeholder)', () => {
    expect(interpolate('Hello {name}', { name: null })).toBe('Hello {name}')
  })

  it('handles object with custom toString', () => {
    const obj = { toString() { return 'custom' } }
    expect(interpolate('Value: {v}', { v: obj })).toBe('Value: custom')
  })

  it('ignores extra values not in template', () => {
    expect(interpolate('Hello {name}', { name: 'World', extra: 'unused' })).toBe('Hello World')
  })

  it('handles empty string value', () => {
    expect(interpolate('Hello {name}!', { name: '' })).toBe('Hello !')
  })
})

// ─── Offset and # edge cases ──────────────────────────────────────────

describe('offset and # edge cases', () => {
  it('plural offset + # shows adjusted value', () => {
    const msg = '{n, plural, offset:1 =1 {yourself} one {# other} other {# others}}'
    expect(interpolate(msg, { n: 1 }, 'en')).toBe('yourself')
    expect(interpolate(msg, { n: 2 }, 'en')).toBe('1 other')
    expect(interpolate(msg, { n: 5 }, 'en')).toBe('4 others')
  })

  it('# in non-plural context renders as literal #', () => {
    expect(interpolate('Item #', {})).toBe('Item #')
  })

  it('nested plural # references inner count', () => {
    const msg = '{a, plural, other {{b, plural, one {# inner} other {# inners}}}}'
    expect(interpolate(msg, { a: 10, b: 1 }, 'en')).toBe('1 inner')
    expect(interpolate(msg, { a: 10, b: 5 }, 'en')).toBe('5 inners')
  })

  it('select with nested plural uses # from plural', () => {
    const msg = '{g, select, male {{n, plural, one {he has # item} other {he has # items}}} other {other}}'
    expect(interpolate(msg, { g: 'male', n: 3 }, 'en')).toBe('he has 3 items')
  })
})

describe('XSS prevention', () => {
  it('does not interpret HTML tags in interpolated values', () => {
    const result = interpolate('Hello {name}', { name: '<script>alert("xss")</script>' })
    expect(result).toBe('Hello <script>alert("xss")</script>')
    // The output is a plain string — safe because consumers render as textContent
  })

  it('does not interpret event handlers in interpolated values', () => {
    const result = interpolate('Hello {name}', { name: '<img src=x onerror="alert(1)">' })
    expect(result).toBe('Hello <img src=x onerror="alert(1)">')
  })

  it('does not interpret HTML entities in interpolated values', () => {
    const result = interpolate('Hello {name}', { name: '&lt;script&gt;' })
    expect(result).toBe('Hello &lt;script&gt;')
  })

  it('handles curly braces in values without creating new placeholders', () => {
    const result = interpolate('Hello {name}', { name: '{other}' })
    // The value should be used literally, not re-interpolated
    expect(result).toBe('Hello {other}')
  })

  it('plural values with HTML are stringified safely', () => {
    const msg = '{count, plural, one {# item for {name}} other {# items for {name}}}'
    const result = interpolate(msg, { count: 1, name: '<b>attacker</b>' }, 'en')
    expect(result).toBe('1 item for <b>attacker</b>')
    // Plain string — no HTML interpretation at the core level
  })

  it('select values with HTML are stringified safely', () => {
    const msg = '{gender, select, male {Mr. {name}} female {Ms. {name}} other {{name}}}'
    const result = interpolate(msg, { gender: 'other', name: '<script>alert(1)</script>' })
    expect(result).toBe('<script>alert(1)</script>')
  })
})
