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

  it('uses positional placeholders for expressions', () => {
    const name = 'World'
    const result = msg`Hello ${name}`
    expect(result.message).toBe('Hello {0}')
  })

  it('handles multiple expressions', () => {
    const a = 1
    const b = 2
    const result = msg`${a} + ${b} = ${a + b}`
    expect(result.message).toBe('{0} + {1} = {2}')
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
})
