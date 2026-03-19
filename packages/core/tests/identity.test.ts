import { describe, it, expect } from 'vitest'
import {
  canonicalizeMessageIdentity,
  createMessageId,
  resolveDescriptorId,
  isGeneratedMessageId,
} from '../src/identity'
import { hashMessage } from '../src/msg'

describe('canonicalizeMessageIdentity', () => {
  it('returns message as-is when no context provided', () => {
    expect(canonicalizeMessageIdentity('Hello World')).toBe('Hello World')
  })

  it('returns message as-is when context is undefined', () => {
    expect(canonicalizeMessageIdentity('Save changes', undefined)).toBe('Save changes')
  })

  it('returns JSON array string when context is provided', () => {
    expect(canonicalizeMessageIdentity('Save', 'button')).toBe(JSON.stringify(['Save', 'button']))
  })

  it('includes both message and context in JSON output', () => {
    const result = canonicalizeMessageIdentity('Delete', 'confirm-dialog')
    const parsed = JSON.parse(result)
    expect(parsed).toEqual(['Delete', 'confirm-dialog'])
  })

  it('handles empty string message', () => {
    expect(canonicalizeMessageIdentity('')).toBe('')
  })

  it('handles empty string context produces JSON', () => {
    const result = canonicalizeMessageIdentity('Hello', '')
    expect(result).toBe(JSON.stringify(['Hello', '']))
  })
})

describe('createMessageId', () => {
  it('returns a hash string', () => {
    const id = createMessageId('Hello World')
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('matches hashMessage output without context', () => {
    const msg = 'Some message'
    expect(createMessageId(msg)).toBe(hashMessage(msg))
  })

  it('matches hashMessage output with context', () => {
    const msg = 'Save'
    const ctx = 'button'
    expect(createMessageId(msg, ctx)).toBe(hashMessage(msg, ctx))
  })

  it('produces different ids for different messages', () => {
    expect(createMessageId('Hello')).not.toBe(createMessageId('World'))
  })

  it('produces different ids for same message with different context', () => {
    expect(createMessageId('Save')).not.toBe(createMessageId('Save', 'button'))
  })

  it('is deterministic — same input always gives same output', () => {
    const msg = 'Deterministic test'
    expect(createMessageId(msg)).toBe(createMessageId(msg))
    expect(createMessageId(msg, 'ctx')).toBe(createMessageId(msg, 'ctx'))
  })
})

describe('resolveDescriptorId', () => {
  it('returns explicit id when provided and non-empty', () => {
    const descriptor = { id: 'explicit-id', message: 'Hello' }
    expect(resolveDescriptorId(descriptor)).toBe('explicit-id')
  })

  it('explicit id takes priority over message hash', () => {
    const descriptor = { id: 'my-id', message: 'Some message', context: 'ctx' }
    expect(resolveDescriptorId(descriptor)).toBe('my-id')
  })

  it('falls through to message hash when id is empty string', () => {
    const msg = 'Hello World'
    const descriptor = { id: '', message: msg }
    const expected = createMessageId(msg)
    expect(resolveDescriptorId(descriptor)).toBe(expected)
  })

  it('uses message hash when no id provided but message exists', () => {
    const msg = 'No explicit id'
    const descriptor = { message: msg }
    expect(resolveDescriptorId(descriptor)).toBe(createMessageId(msg))
  })

  it('uses message hash with context when context is present', () => {
    const msg = 'Contextual message'
    const ctx = 'some-context'
    const descriptor = { message: msg, context: ctx }
    expect(resolveDescriptorId(descriptor)).toBe(createMessageId(msg, ctx))
  })

  it('returns empty string when no id and no message', () => {
    const descriptor = {}
    expect(resolveDescriptorId(descriptor)).toBe('')
  })

  it('returns empty string when id is undefined and no message', () => {
    const descriptor = { id: undefined }
    expect(resolveDescriptorId(descriptor)).toBe('')
  })
})

describe('isGeneratedMessageId', () => {
  it('returns false when message is undefined', () => {
    const id = createMessageId('Hello')
    expect(isGeneratedMessageId(id, undefined)).toBe(false)
  })

  it('returns true when id matches the hash of message', () => {
    const msg = 'Hello World'
    const id = createMessageId(msg)
    expect(isGeneratedMessageId(id, msg)).toBe(true)
  })

  it('returns false when id does not match the hash of message', () => {
    expect(isGeneratedMessageId('wrong-id', 'Hello World')).toBe(false)
  })

  it('returns true when id matches hash of message with context', () => {
    const msg = 'Save'
    const ctx = 'button'
    const id = createMessageId(msg, ctx)
    expect(isGeneratedMessageId(id, msg, ctx)).toBe(true)
  })

  it('returns false when context differs from what was used to create id', () => {
    const msg = 'Save'
    const id = createMessageId(msg, 'button')
    expect(isGeneratedMessageId(id, msg, 'dialog')).toBe(false)
  })

  it('returns false when id was created with context but checked without', () => {
    const msg = 'Save'
    const id = createMessageId(msg, 'button')
    expect(isGeneratedMessageId(id, msg)).toBe(false)
  })

  it('returns false when id is an explicit non-generated id', () => {
    expect(isGeneratedMessageId('my-custom-id', 'Hello')).toBe(false)
  })
})
