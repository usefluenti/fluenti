import { describe, it, expect } from 'vitest'
import { extractMessage, reconstruct } from '../src/rich-dom'

// ─── extractMessage — void elements ──────────────────────────────────────────

describe('extractMessage — void elements (DOM)', () => {
  it('outputs <idx/> for void elements like <br>', () => {
    const br = document.createElement('br')
    const text1 = document.createTextNode('Hello ')
    const text2 = document.createTextNode(' world')
    const { message, components } = extractMessage([text1, br, text2])
    expect(message).toBe('Hello <0/> world')
    expect(components).toHaveLength(1)
  })

  it('outputs <idx/> for <hr>', () => {
    const hr = document.createElement('hr')
    const { message } = extractMessage(hr)
    expect(message).toBe('<0/>')
  })

  it('outputs <idx/> for multiple void elements', () => {
    const br = document.createElement('br')
    const hr = document.createElement('hr')
    const { message, components } = extractMessage([br, hr])
    expect(message).toBe('<0/><1/>')
    expect(components).toHaveLength(2)
  })

  it('mixes void and paired elements correctly', () => {
    const br = document.createElement('br')
    const b = document.createElement('b')
    b.textContent = 'bold'
    const text1 = document.createTextNode('Hello ')
    const text2 = document.createTextNode(' ')
    const { message, components } = extractMessage([text1, br, text2, b])
    expect(message).toBe('Hello <0/> <1>bold</1>')
    expect(components).toHaveLength(2)
  })
})

// ─── reconstruct — void elements ─────────────────────────────────────────────

describe('reconstruct — void elements (DOM)', () => {
  it('reconstructs self-closing <0/> tags', () => {
    const br = document.createElement('br')
    const result = reconstruct('<0/>', [br])
    // result should be a cloned br node
    expect(result).toBeDefined()
    if (result instanceof Node) {
      expect((result as Element).tagName?.toLowerCase()).toBe('br')
    }
  })

  it('reconstructs mixed void and paired tags', () => {
    const br = document.createElement('br')
    const b = document.createElement('b')
    const result = reconstruct('Hello <0/> <1>world</1>', [br, b])
    expect(result).toBeDefined()
    // Should be an array with text, br clone, text, b clone
    expect(Array.isArray(result)).toBe(true)
    const arr = result as unknown[]
    expect(arr.length).toBe(4)
  })

  it('handles out-of-bounds self-closing index gracefully', () => {
    const result = reconstruct('<5/>', [])
    // No component at index 5 — should not crash
    expect(result).toBeDefined()
  })
})
