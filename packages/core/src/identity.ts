import type { MessageDescriptor } from './types'

/**
 * Build the canonical identity input for a message/context pair.
 *
 * Context-free messages intentionally keep the legacy identity input so
 * existing hashes remain stable across the pre-1.0 migration.
 */
export function canonicalizeMessageIdentity(message: string, context?: string): string {
  return context === undefined ? message : JSON.stringify([message, context])
}

/**
 * FNV-1a hash producing a short alphanumeric ID.
 */
export function hashMessage(message: string, context?: string): string {
  const input = canonicalizeMessageIdentity(message, context)
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  // Convert to unsigned and then to base36
  return (hash >>> 0).toString(36)
}

/** Compute the default message ID for a source message/context pair. */
export function createMessageId(message: string, context?: string): string {
  return hashMessage(message, context)
}

/**
 * Resolve the effective lookup ID for a descriptor.
 *
 * Explicit non-empty IDs win. Otherwise, descriptors with a source message use
 * the default hash-based ID derived from message/context.
 */
export function resolveDescriptorId(descriptor: MessageDescriptor): string {
  if (typeof descriptor.id === 'string' && descriptor.id.length > 0) {
    return descriptor.id
  }
  if (typeof descriptor.message === 'string') {
    return createMessageId(descriptor.message, descriptor.context)
  }
  return descriptor.id ?? ''
}

/** Whether the supplied ID is the auto-generated ID for this message/context. */
export function isGeneratedMessageId(id: string, message?: string, context?: string): boolean {
  if (message === undefined) return false
  return id === createMessageId(message, context)
}
