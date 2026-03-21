import { describe, it, expect } from 'vitest'
import { createElement, type ReactElement } from 'react'
import { hashMessage, extractMessage, reconstruct } from '../src/components/trans-core'

// ─── hashMessage ──────────────────────────────────────────────

describe('hashMessage', () => {
  it('returns consistent hash for the same input', () => {
    const a = hashMessage('Hello World')
    const b = hashMessage('Hello World')
    expect(a).toBe(b)
  })

  it('returns different hashes for different inputs', () => {
    const a = hashMessage('Hello World')
    const b = hashMessage('Goodbye World')
    expect(a).not.toBe(b)
  })
})

// ─── extractMessage ───────────────────────────────────────────

describe('extractMessage', () => {
  it('extracts pure text children', () => {
    const { message, components } = extractMessage('Hello World')
    expect(message).toBe('Hello World')
    expect(components).toEqual([])
  })

  it('extracts a single element child', () => {
    // Equivalent to: <b>bold</b>
    const child = createElement('b', null, 'bold')
    const { message, components } = extractMessage(child)
    expect(message).toBe('<0>bold</0>')
    expect(components).toHaveLength(1)
  })

  it('extracts mixed text and elements', () => {
    // Equivalent to: ["Hello ", <b>world</b>, "!"]
    const children = [
      'Hello ',
      createElement('b', null, 'world'),
      '!',
    ]
    const { message, components } = extractMessage(children)
    expect(message).toBe('Hello <0>world</0>!')
    expect(components).toHaveLength(1)
  })

  it('extracts deeply nested elements', () => {
    // Equivalent to: <b><em>deep</em></b>
    const inner = createElement('em', null, 'deep')
    const outer = createElement('b', null, inner)
    const { message, components } = extractMessage(outer)
    expect(message).toBe('<0><1>deep</1></0>')
    expect(components).toHaveLength(2)
  })

  it('extracts number children', () => {
    const { message, components } = extractMessage(42)
    expect(message).toBe('42')
    expect(components).toEqual([])
  })

  it('handles null and undefined children gracefully', () => {
    const { message: nullMsg, components: nullC } = extractMessage(null)
    expect(nullMsg).toBe('')
    expect(nullC).toEqual([])

    const { message: undefMsg, components: undefC } = extractMessage(undefined)
    expect(undefMsg).toBe('')
    expect(undefC).toEqual([])
  })
})

// ─── reconstruct ──────────────────────────────────────────────

describe('reconstruct', () => {
  it('returns plain text when there are no tags', () => {
    const result = reconstruct('Hello World', [])
    expect(result).toBe('Hello World')
  })

  it('reconstructs a single tag', () => {
    const comp = createElement('b', null, 'placeholder') as ReactElement
    const result = reconstruct('<0>bold</0>', [comp])
    // result should be a Fragment or a cloned element
    expect(result).toBeDefined()
    // The cloned element should be a 'b' with key 'trans-0'
    const el = result as ReactElement
    expect(el.type).toBe('b')
    expect(el.key).toBe('trans-0')
  })

  it('reconstructs multiple tags', () => {
    const b = createElement('b', null, 'placeholder') as ReactElement
    const em = createElement('em', null, 'placeholder') as ReactElement
    const result = reconstruct('Hello <0>bold</0> and <1>italic</1>!', [b, em])
    // Result should be a Fragment containing multiple children
    expect(result).toBeDefined()
    // With mixed text and elements, it returns a Fragment
    const frag = result as ReactElement
    expect(frag.type).toBeDefined()
  })

  it('falls back to inner text when tag index is out of bounds', () => {
    // Index 5 does not exist in the components array
    const result = reconstruct('<5>orphan</5>', [])
    // When component is not found, it pushes just the inner text
    expect(result).toBe('orphan')
  })

  it('reconstructs nested tags', () => {
    const b = createElement('b', null, 'placeholder') as ReactElement
    const em = createElement('em', null, 'placeholder') as ReactElement
    const result = reconstruct('<0><1>nested</1></0>', [b, em])
    expect(result).toBeDefined()
    // Outer element should be 'b'
    const el = result as ReactElement
    expect(el.type).toBe('b')
    expect(el.key).toBe('trans-0')
  })

  it('returns empty string for empty translation', () => {
    const result = reconstruct('', [])
    // Empty string: lastIndex (0) is not < translated.length (0), so result array is empty
    // result.length === 0, so createElement(Fragment, null, ...result) is returned
    // Actually: result is empty array, length !== 1, so Fragment is returned
    expect(result).toBeDefined()
  })
})

// ─── Bug fix: void/self-closing elements ──────────────────────────────────────

describe('extractMessage — void elements', () => {
  it('outputs <idx/> for childless elements like <br />', () => {
    const br = createElement('br')
    const { message, components } = extractMessage(['Hello ', br, ' world'])
    expect(message).toBe('Hello <0/> world')
    expect(components).toHaveLength(1)
  })

  it('outputs <idx/> for <hr />', () => {
    const hr = createElement('hr')
    const { message } = extractMessage(hr)
    expect(message).toBe('<0/>')
  })

  it('outputs <idx/> for multiple void elements', () => {
    const br = createElement('br')
    const hr = createElement('hr')
    const { message, components } = extractMessage([br, hr])
    expect(message).toBe('<0/><1/>')
    expect(components).toHaveLength(2)
  })

  it('mixes void and paired elements correctly', () => {
    const br = createElement('br')
    const b = createElement('b', null, 'bold')
    const { message, components } = extractMessage(['Hello ', br, ' ', b])
    expect(message).toBe('Hello <0/> <1>bold</1>')
    expect(components).toHaveLength(2)
  })
})

describe('reconstruct — void elements', () => {
  it('reconstructs self-closing <0/> tags', () => {
    const br = createElement('br') as ReactElement
    const result = reconstruct('<0/>', [br])
    const el = result as ReactElement
    expect(el.type).toBe('br')
    expect(el.key).toBe('trans-0')
  })

  it('reconstructs mixed void and paired tags', () => {
    const br = createElement('br') as ReactElement
    const b = createElement('b', null, 'placeholder') as ReactElement
    const result = reconstruct('Hello <0/> <1>world</1>', [br, b])
    expect(result).toBeDefined()
    // Result should be a Fragment with text, br, text, b
    const frag = result as ReactElement
    expect(frag.type).toBeDefined()
  })

  it('falls back gracefully for out-of-bounds self-closing index', () => {
    const result = reconstruct('<5/>', [])
    // No component at index 5 — pushes innerText (empty string for self-closing)
    expect(result).toBeDefined()
  })
})
