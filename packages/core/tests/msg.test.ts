import { describe, it, expect } from 'vitest'
import { msg } from '../src/msg'

describe('msg', () => {
  it('creates a message descriptor from tagged template', () => {
    const result = msg`Hello World`
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('message')
    expect(result.message).toBe('Hello World')
    expect(typeof result.id).toBe('string')
    expect(result.id.length).toBeGreaterThan(0)
  })

  it('uses named placeholders for expressions', () => {
    const name = 'World'
    const result = msg`Hello ${name}`
    expect(result.message).toBe('Hello {arg0}')
  })

  it('handles multiple expressions', () => {
    const a = 1
    const b = 2
    const result = msg`${a} + ${b} = ${a + b}`
    expect(result.message).toBe('{arg0} + {arg1} = {arg2}')
  })

  it('generates consistent IDs for same message', () => {
    const a = msg`Hello World`
    const b = msg`Hello World`
    expect(a.id).toBe(b.id)
  })

  it('generates different IDs for different messages', () => {
    const a = msg`Hello`
    const b = msg`Goodbye`
    expect(a.id).not.toBe(b.id)
  })

  it('msg.descriptor passes through descriptor', () => {
    const desc = { id: 'test', message: 'Hello {name}' }
    expect(msg.descriptor(desc)).toBe(desc)
  })

  it('msg.descriptor preserves all fields', () => {
    const desc = { id: 'test', message: 'Hello', comment: 'A greeting', context: 'home' }
    const result = msg.descriptor(desc)
    expect(result.id).toBe('test')
    expect(result.message).toBe('Hello')
    expect(result.comment).toBe('A greeting')
    expect(result.context).toBe('home')
  })

  // ─── Edge cases ──────────────────────────────────────────────────────

  it('generates ID for empty template', () => {
    const result = msg``
    expect(result.message).toBe('')
    expect(typeof result.id).toBe('string')
    expect(result.id.length).toBeGreaterThan(0)
  })

  it('handles Unicode messages', () => {
    const result = msg`こんにちは世界`
    expect(result.message).toBe('こんにちは世界')
    expect(typeof result.id).toBe('string')
  })

  it('handles emoji in messages', () => {
    const result = msg`Hello 👋 World`
    expect(result.message).toBe('Hello 👋 World')
    expect(typeof result.id).toBe('string')
  })

  it('NFC vs NFD unicode may produce different IDs', () => {
    const nfc = msg`caf\u00e9`
    const nfd = msg`cafe\u0301`
    expect(nfc.message).not.toBe(nfd.message)
  })

  it('msg.descriptor returns same reference', () => {
    const desc = { id: 'x', message: 'y' }
    expect(msg.descriptor(desc)).toBe(desc)
  })

  it('very long message still produces valid ID', () => {
    const longText = 'a'.repeat(10000)
    const result = msg`${longText}`
    expect(result.message).toBe('{arg0}')
    expect(typeof result.id).toBe('string')
    expect(result.id.length).toBeGreaterThan(0)
  })
})

// ─── Exhaustive edge cases ───────────────────────────────────────────────

describe('edge cases - exhaustive', () => {
  it('expression is undefined', () => {
    const result = msg`value is ${undefined}`
    expect(result.message).toBe('value is {arg0}')
    expect(typeof result.id).toBe('string')
  })

  it('expression is null', () => {
    const result = msg`value is ${null}`
    expect(result.message).toBe('value is {arg0}')
    expect(typeof result.id).toBe('string')
  })

  it('expression is 0', () => {
    const result = msg`count is ${0}`
    expect(result.message).toBe('count is {arg0}')
    expect(typeof result.id).toBe('string')
  })

  it('expression is false', () => {
    const result = msg`flag is ${false}`
    expect(result.message).toBe('flag is {arg0}')
    expect(typeof result.id).toBe('string')
  })

  it('descriptor missing id (only message)', () => {
    const desc = msg.descriptor({ id: '', message: 'Hello' })
    expect(desc.id).toBeTruthy()
    expect(desc.message).toBe('Hello')
  })

  it('hash collision resilience (two similar messages)', () => {
    // These are very similar messages - verify they get distinct IDs
    const a = msg`item count`
    const b = msg`item counts`
    expect(a.id).not.toBe(b.id)
  })

  it('contains backticks', () => {
    const tick = '`'
    const result = msg`code ${tick}example${tick}`
    expect(result.message).toBe('code {arg0}example{arg1}')
  })

  it('contains regex special characters', () => {
    const result = msg`price is ${'$'}10.00 (USD)`
    expect(result.message).toBe('price is {arg0}10.00 (USD)')
  })
})
