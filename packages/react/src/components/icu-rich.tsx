import type { MessageDescriptor } from '@fluenti/core'
import type { ReactElement, ReactNode } from 'react'
import { extractMessage, offsetIndices, reconstruct } from './trans-core'
import { PLURAL_CATEGORIES, type PluralCategory } from './plural-core'

export interface RichMessagePart {
  message: string
  components: ReactElement[]
}

export function buildICUPluralMessage(
  forms: Partial<Record<PluralCategory, string>> & { other: string },
  offset?: number,
): string {
  const parts: string[] = []
  for (const cat of PLURAL_CATEGORIES) {
    const text = forms[cat]
    if (text === undefined) continue
    parts.push(`${cat === 'zero' ? '=0' : cat} {${text}}`)
  }
  const offsetPrefix = offset ? `offset:${offset} ` : ''
  return `{count, plural, ${offsetPrefix}${parts.join(' ')}}`
}

export function buildICUSelectMessage(
  forms: Record<string, string>,
): string {
  const entries = Object.entries(forms).filter(([, text]) => text !== undefined)
  return `{value, select, ${entries.map(([key, text]) => `${key} {${text}}`).join(' ')}}`
}

export function normalizeSelectForms(
  forms: Record<string, string>,
): {
  forms: Record<string, string>
  valueMap: Record<string, string>
} {
  const normalized: Record<string, string> = {}
  const valueMap: Record<string, string> = {}
  let index = 0

  for (const [key, text] of Object.entries(forms)) {
    if (key === 'other') {
      normalized['other'] = text
      continue
    }

    const safeKey = /^[A-Za-z0-9_]+$/.test(key) ? key : `case_${index++}`
    normalized[safeKey] = text
    valueMap[key] = safeKey
  }

  if (normalized['other'] === undefined) {
    normalized['other'] = ''
  }

  return { forms: normalized, valueMap }
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
