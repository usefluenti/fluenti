/**
 * Shared ICU message building utilities.
 *
 * These pure functions are used by framework components (`<Plural>`, `<Select>`)
 * to construct ICU MessageFormat strings from component props.
 *
 * @module
 */

/** Plural category names in a stable order for ICU message building. */
export const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const

export type PluralCategory = (typeof PLURAL_CATEGORIES)[number]

/**
 * Build an ICU plural message string from individual category forms.
 *
 * Maps the `zero` prop to ICU `=0` exact match. In ICU MessageFormat,
 * `zero` is a CLDR plural category that only activates in languages
 * with a grammatical zero form (e.g. Arabic). The `=0` exact match
 * works universally for the common "show this when count is 0" intent.
 *
 * @example
 * ```ts
 * buildICUPluralMessage({ zero: "No items", one: "# item", other: "# items" })
 * // => "{count, plural, =0 {No items} one {# item} other {# items}}"
 * ```
 *
 * @internal
 */
export function buildICUPluralMessage(
  forms: Partial<Record<PluralCategory, string>> & { other: string },
  offset?: number,
): string {
  const parts: string[] = []
  for (const cat of PLURAL_CATEGORIES) {
    const text = forms[cat]
    if (text !== undefined) {
      const key = cat === 'zero' ? '=0' : cat
      parts.push(`${key} {${text}}`)
    }
  }
  const offsetPrefix = offset ? `offset:${offset} ` : ''
  return `{count, plural, ${offsetPrefix}${parts.join(' ')}}`
}

/**
 * Build an ICU select message string from key-value form pairs.
 *
 * @example
 * ```ts
 * buildICUSelectMessage({ male: "He", female: "She", other: "They" })
 * // => "{value, select, male {He} female {She} other {They}}"
 * ```
 *
 * @internal
 */
export function buildICUSelectMessage(
  forms: Record<string, string>,
): string {
  const entries = Object.entries(forms).filter(([, text]) => text !== undefined)
  return `{value, select, ${entries.map(([key, text]) => `${key} {${text}}`).join(' ')}}`
}

/**
 * Normalize select form keys so they are safe for ICU MessageFormat.
 *
 * Keys that contain non-alphanumeric characters are replaced with
 * `case_N` identifiers, and a `valueMap` is returned so the original
 * key can be mapped to the safe key at runtime.
 *
 * @internal
 */
export function normalizeSelectForms(forms: Record<string, string>): {
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

/**
 * Offset numeric indices in a rich-text message string.
 *
 * Rich-text messages use `<0>content</0>` tags where numbers reference
 * components. When composing multiple forms (e.g. plural categories),
 * each form's indices must be offset to avoid collisions.
 *
 * @internal
 */
export function offsetIndices(message: string, offset: number): string {
  if (offset === 0) return message
  return message
    .replace(/<(\d+)(\/?>)/g, (_match, index: string, suffix: string) => `<${Number(index) + offset}${suffix}`)
    .replace(/<\/(\d+)>/g, (_match, index: string) => `</${Number(index) + offset}>`)
}
