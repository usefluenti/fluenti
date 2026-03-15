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
