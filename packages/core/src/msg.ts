import type { MessageDescriptor } from './types'
import { createMessageId } from './identity'

// Re-export hashMessage so existing imports from './msg' continue to work
export { hashMessage } from './identity'

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
