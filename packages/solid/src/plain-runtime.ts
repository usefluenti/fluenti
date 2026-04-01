import {
  PLURAL_CATEGORIES,
  buildICUPluralMessage,
  buildICUSelectMessage,
  hashMessage,
  normalizeSelectForms,
  type PluralCategory,
} from '@fluenti/core/runtime'

export function resolvePropValue(value: unknown): unknown {
  if (typeof value === 'function' && !(value as { length?: number }).length) {
    return (value as () => unknown)()
  }
  return value
}

export function resolveCompiledMessageId(
  id: string | undefined,
  message: string,
  context: string | undefined,
): string {
  return id ?? (context === undefined ? message : hashMessage(message, context))
}

function isPlainTextValue(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number'
}

export function buildPlainPluralMessage(
  forms: Partial<Record<PluralCategory, unknown>>,
  offset?: number,
): string | undefined {
  const plainForms: Partial<Record<PluralCategory, string>> = {}

  for (const category of PLURAL_CATEGORIES) {
    const resolved = resolvePropValue(forms[category])
    if (resolved === undefined) continue
    if (!isPlainTextValue(resolved)) return undefined
    plainForms[category] = String(resolved)
  }

  if (plainForms['other'] === undefined) return undefined
  return buildICUPluralMessage(plainForms as Partial<Record<PluralCategory, string>> & { other: string }, offset)
}

export function buildPlainSelectMessage(
  forms: Record<string, unknown>,
): { message: string; valueMap: Record<string, string> } | undefined {
  const plainForms: Record<string, string> = {}

  for (const [key, value] of Object.entries(forms)) {
    const resolved = resolvePropValue(value)
    if (resolved === undefined) continue
    if (!isPlainTextValue(resolved)) return undefined
    plainForms[key] = String(resolved)
  }

  if (plainForms['other'] === undefined) return undefined

  const normalized = normalizeSelectForms(plainForms)
  return {
    message: buildICUSelectMessage(normalized.forms),
    valueMap: normalized.valueMap,
  }
}
