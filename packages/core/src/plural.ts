import type { Locale } from './types'

const rulesCache = new Map<string, Intl.PluralRules>()

/**
 * Clear the cached `Intl.PluralRules` instances.
 *
 * Useful for long-running Node.js servers to reclaim memory.
 */
export function clearPluralCache(): void {
  rulesCache.clear()
}

/**
 * Get or create a cached `Intl.PluralRules` instance for a locale.
 */
function getRules(locale: Locale, type: Intl.PluralRulesOptions['type'] = 'cardinal'): Intl.PluralRules {
  const cacheKey = `${locale}:${type}`
  let rules = rulesCache.get(cacheKey)
  if (!rules) {
    rules = new Intl.PluralRules(locale, { type })
    rulesCache.set(cacheKey, rules)
  }
  return rules
}

/**
 * Resolve the correct plural category for a count value.
 *
 * Checks exact matches (`=0`, `=1`, etc.) first, then falls back
 * to CLDR plural categories via `Intl.PluralRules`.
 * If no match is found, returns `'other'` category.
 *
 * @param count - The numeric value to pluralize
 * @param options - Map of plural keys to values (e.g. `{ '=0': ..., 'one': ..., 'other': ... }`)
 * @param locale - BCP 47 locale string
 * @returns The key from options that matches
 */
export function resolvePlural(
  count: number,
  options: Record<string, unknown>,
  locale: Locale,
  ordinal?: boolean,
): string {
  // Exact match first
  const exactKey = `=${count}`
  if (exactKey in options) {
    return exactKey
  }

  return resolvePluralCategory(count, options, locale, ordinal)
}

/**
 * Resolve the CLDR plural category only (no exact match check).
 * Used when exact matches need to be checked against raw count
 * but CLDR categories against adjusted count (with offset).
 *
 * @param count - The numeric value (possibly offset-adjusted)
 * @param options - Map of plural keys
 * @param locale - BCP 47 locale string
 * @returns The CLDR category key or 'other'
 */
export function resolvePluralCategory(
  count: number,
  options: Record<string, unknown>,
  locale: Locale,
  ordinal?: boolean,
): string {
  const rules = getRules(locale, ordinal ? 'ordinal' : 'cardinal')
  const category = rules.select(count)
  if (category in options) {
    return category
  }

  return 'other'
}
