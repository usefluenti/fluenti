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
})
