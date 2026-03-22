import {
  type MessageDescriptor,
  buildICUPluralMessage,
  buildICUSelectMessage,
  normalizeSelectForms,
  offsetIndices,
} from '@fluenti/core'
import type { ReactElement, ReactNode } from 'react'
import { extractMessage, reconstruct } from './trans-core'

export { buildICUPluralMessage, buildICUSelectMessage, normalizeSelectForms }

export interface RichMessagePart {
  message: string
  components: ReactElement[]
}

export function serializeRichNode(node: ReactNode): RichMessagePart {
  const extracted = extractMessage(node)
  return {
    message: extracted.message,
    components: extracted.components,
  }
}

export function serializeRichForms<T extends string>(
  keys: readonly T[],
  forms: Partial<Record<T, ReactNode>> & Record<string, ReactNode | undefined>,
): {
  messages: Partial<Record<T, string>> & Record<string, string>
  components: ReactElement[]
} {
  const components: ReactElement[] = []
  const messages: Record<string, string> = {}

  for (const key of keys) {
    const value = forms[key]
    if (value === undefined) continue
    const extracted = serializeRichNode(value)
    messages[key] = offsetIndices(extracted.message, components.length)
    components.push(...extracted.components)
  }

  for (const [key, value] of Object.entries(forms)) {
    if (keys.includes(key as T) || value === undefined) continue
    const extracted = serializeRichNode(value)
    messages[key] = offsetIndices(extracted.message, components.length)
    components.push(...extracted.components)
  }

  return { messages: messages as Partial<Record<T, string>> & Record<string, string>, components }
}

export function renderRichTranslation(
  descriptor: MessageDescriptor,
  values: Record<string, unknown> | undefined,
  translate: (descriptor: MessageDescriptor, values?: Record<string, unknown>) => string,
  components: ReactElement[],
): ReactNode {
  const translated = translate(descriptor, values)
  return components.length > 0 ? reconstruct(translated, components) : translated
}
