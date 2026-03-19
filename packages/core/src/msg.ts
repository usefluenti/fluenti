import type { MessageDescriptor } from './types'
import { canonicalizeMessageIdentity, createMessageId } from './identity'

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

/**
 * Build an ICU message string from tagged template parts.
 * Uses named placeholders: `{arg0}`, `{arg1}`, etc.
 */
export function buildICUMessage(strings: TemplateStringsArray, exprs: unknown[]): string {
  let result = strings[0]!
  for (let i = 0; i < exprs.length; i++) {
    result += `{arg${i}}` + strings[i + 1]!
  }
  return result
}

/**
 * Tagged template for creating lazy message descriptors.
 *
 * @example
 * ```ts
 * const greeting = msg`Hello ${name}`
 * // -> { id: 'abc123', message: 'Hello {arg0}' }
 * ```
 */
export function msg(
  strings: TemplateStringsArray,
  ...exprs: unknown[]
): MessageDescriptor {
  const message = buildICUMessage(strings, exprs)
  return { id: createMessageId(message), message }
}

/**
 * Pass through a message descriptor unchanged.
 * Used for explicit ID declarations that can be statically extracted.
 *
 * @example
 * ```ts
 * const desc = msg.descriptor({ id: 'greeting', message: 'Hello {name}' })
 * ```
 */
msg.descriptor = (desc: MessageDescriptor): MessageDescriptor => {
  if ((desc.id === undefined || desc.id === '') && desc.message !== undefined) {
    return {
      ...desc,
      id: createMessageId(desc.message, desc.context),
    }
  }
  return desc
}
