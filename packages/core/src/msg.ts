import type { MessageDescriptor } from './types'

/**
 * FNV-1a hash producing a short alphanumeric ID.
 */
function hashMessage(message: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < message.length; i++) {
    hash ^= message.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  // Convert to unsigned and then to base36
  return (hash >>> 0).toString(36)
}

/**
 * Build an ICU message string from tagged template parts.
 * Uses positional placeholders: `{0}`, `{1}`, etc.
 */
function buildICUMessage(strings: TemplateStringsArray, exprs: unknown[]): string {
  let result = strings[0]!
  for (let i = 0; i < exprs.length; i++) {
    result += `{${i}}` + strings[i + 1]!
  }
  return result
}

/**
 * Tagged template for creating lazy message descriptors.
 *
 * @example
 * ```ts
 * const greeting = msg`Hello ${name}`
 * // -> { id: 'abc123', message: 'Hello {0}' }
 * ```
 */
export function msg(
  strings: TemplateStringsArray,
  ...exprs: unknown[]
): MessageDescriptor {
  const message = buildICUMessage(strings, exprs)
  return { id: hashMessage(message), message }
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
msg.descriptor = (desc: MessageDescriptor): MessageDescriptor => desc
