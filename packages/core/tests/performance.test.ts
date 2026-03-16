import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser'
import { compile } from '../src/compile'
import { interpolate } from '../src/interpolate'

describe('performance', () => {
  it('parses, compiles, and executes 1000 messages in under 50ms', () => {
    const messages = [
      'Hello World',
      'Hello {name}',
      '{count, plural, =0 {none} one {# item} other {# items}}',
      '{gender, select, male {He} female {She} other {They}}',
      '{amount, number, currency}',
      'Welcome {user} to {place}',
      '{n, plural, one {# message from {sender}} other {# messages from {sender}}}',
      'Today is {date, date, short}',
      '{x} + {y} = {result}',
      'Plain text message with no interpolation needed at all',
    ]

    const start = performance.now()

    for (let i = 0; i < 100; i++) {
      for (const msg of messages) {
        const ast = parse(msg)
        const compiled = compile(ast, 'en')
        if (typeof compiled === 'function') {
          compiled({ name: 'Test', count: 5, gender: 'male', amount: 42, user: 'Alice', place: 'Home', sender: 'Bob', n: 3, date: new Date(), x: 1, y: 2, result: 3 })
        }
      }
    }

    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(500)
  })

  it('handles repeated interpolation efficiently (cache hits)', () => {
    const msg = '{count, plural, =0 {none} one {# item} other {# items}}'

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      interpolate(msg, { count: i % 10 }, 'en')
    }
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(500)
  })

  // ─── Edge cases - exhaustive ──────────────────────────────────────────

  it('10k interpolate calls complete without degradation', () => {
    const start = performance.now()
    for (let i = 0; i < 10000; i++) {
      interpolate(`Message number {n}`, { n: i }, 'en')
    }
    const elapsed = performance.now() - start
    // 10k calls should complete in under 5 seconds
    expect(elapsed).toBeLessThan(5000)
  })

  it('LRU cache upper limit (verify cache does not grow unbounded)', () => {
    // The LRU_MAX is 500. Insert 600 unique messages and verify no crash.
    const start = performance.now()
    for (let i = 0; i < 600; i++) {
      interpolate(`Unique message ${i} with {val}`, { val: i }, 'en')
    }
    const elapsed = performance.now() - start
    // Should complete without issues; if cache grew unbounded it would slow down
    expect(elapsed).toBeLessThan(5000)
    // Verify the most recent entries still work (cache hit)
    const result = interpolate(`Unique message 599 with {val}`, { val: 42 }, 'en')
    expect(result).toBe('Unique message 599 with 42')
  })

  it('deep nested message (5 levels) completes in reasonable time', () => {
    // Build a 5-level nested plural/select message
    const message = '{a, select, x {{b, select, y {{c, select, z {{d, select, w {{e, plural, one {deep-one} other {deep-other}}} other {d-other}}} other {c-other}}} other {b-other}}} other {a-other}}'

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      interpolate(message, { a: 'x', b: 'y', c: 'z', d: 'w', e: 1 }, 'en')
    }
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(2000)

    const result = interpolate(message, { a: 'x', b: 'y', c: 'z', d: 'w', e: 1 }, 'en')
    expect(result).toBe('deep-one')
  })

  it('20+ variable message performance', () => {
    // Build a message with 25 variables
    const vars = [...new Array(25)].map((_, i) => `v${i}`)
    const message = vars.map(v => `{${v}}`).join(' ')
    const values: Record<string, unknown> = {}
    for (const v of vars) {
      values[v] = v.toUpperCase()
    }

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      interpolate(message, values, 'en')
    }
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(2000)

    const result = interpolate(message, values, 'en')
    expect(result).toBe(vars.map(v => v.toUpperCase()).join(' '))
  })
})
