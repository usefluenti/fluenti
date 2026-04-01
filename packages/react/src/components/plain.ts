import {
  PLURAL_CATEGORIES,
  buildICUPluralMessage,
  buildICUSelectMessage,
  hashMessage,
  normalizeSelectForms,
  type PluralCategory,
} from '@fluenti/core/runtime'
import type { ReactNode } from 'react'

export function resolveCompiledMessageId(
  id: string | undefined,
  message: string,
  context: string | undefined,
): string {
  return id ?? (context === undefined ? message : hashMessage(message, context))
}

function isPlainReactNode(value: ReactNode | undefined): value is string | number {
  return typeof value === 'string' || typeof value === 'number'
}

export function buildPlainPluralMessage(
  forms: Record<PluralCategory, ReactNode | undefined>,
  offset?: number,
): string | undefined {
  const plainForms: Partial<Record<PluralCategory, string>> = {}

  for (const category of PLURAL_CATEGORIES) {
    const value = forms[category]
    if (value === undefined) continue
    if (!isPlainReactNode(value)) return undefined
    plainForms[category] = String(value)
  }

  if (plainForms['other'] === undefined) return undefined
  return buildICUPluralMessage(plainForms as Partial<Record<PluralCategory, string>> & { other: string }, offset)
}

export function buildPlainSelectMessage(
  forms: Record<string, ReactNode | undefined>,
): { message: string; valueMap: Record<string, string> } | undefined {
  const plainForms: Record<string, string> = {}

  for (const [key, value] of Object.entries(forms)) {
    if (value === undefined) continue
    if (!isPlainReactNode(value)) return undefined
    plainForms[key] = String(value)
  }

  if (plainForms['other'] === undefined) return undefined

  const normalized = normalizeSelectForms(plainForms)
  return {
    message: buildICUSelectMessage(normalized.forms),
    valueMap: normalized.valueMap,
  }
}
