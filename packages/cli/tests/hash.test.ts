import { describe, it, expect } from 'vitest'
import { hashMessage } from '@fluenti/core'

describe('hashMessage', () => {
  it('returns the same hash for the same input (consistency)', () => {
    const result1 = hashMessage('Hello, world!')
    const result2 = hashMessage('Hello, world!')
    expect(result1).toBe(result2)
  })

  it('returns different hashes for different inputs', () => {
    const hash1 = hashMessage('Hello')
    const hash2 = hashMessage('World')
    const hash3 = hashMessage('Hello, world!')
    expect(hash1).not.toBe(hash2)
    expect(hash1).not.toBe(hash3)
    expect(hash2).not.toBe(hash3)
  })

  it('returns a base36 string (only lowercase alphanumeric)', () => {
    const result = hashMessage('test message')
    expect(result).toMatch(/^[0-9a-z]+$/)
  })

  it('handles empty string input', () => {
    const result = hashMessage('')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
    expect(result).toMatch(/^[0-9a-z]+$/)
  })

  it('handles very long strings (10k+ characters)', () => {
    const longString = 'a'.repeat(10_000)
    const result = hashMessage(longString)
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^[0-9a-z]+$/)
    // Should still be a compact hash
    expect(result.length).toBeLessThanOrEqual(8)
  })

  it('handles unicode input (CJK, emoji)', () => {
    const cjk = hashMessage('你好世界')
    const emoji = hashMessage('Hello 🌍🎉')
    const mixed = hashMessage('こんにちは 世界 🌸')

    expect(cjk).toMatch(/^[0-9a-z]+$/)
    expect(emoji).toMatch(/^[0-9a-z]+$/)
    expect(mixed).toMatch(/^[0-9a-z]+$/)
    // All should be distinct
    expect(new Set([cjk, emoji, mixed]).size).toBe(3)
  })

  it('handles special characters', () => {
    const result1 = hashMessage('<div class="foo">bar & baz</div>')
    const result2 = hashMessage('line1\nline2\ttab')
    const result3 = hashMessage('path/to/file?query=1&foo=bar#anchor')

    expect(result1).toMatch(/^[0-9a-z]+$/)
    expect(result2).toMatch(/^[0-9a-z]+$/)
    expect(result3).toMatch(/^[0-9a-z]+$/)
    expect(new Set([result1, result2, result3]).size).toBe(3)
  })
})
