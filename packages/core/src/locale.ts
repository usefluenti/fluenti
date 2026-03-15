import type { Locale } from './types'

/**
 * Parsed locale components from a BCP 47 locale string.
 */
export interface ParsedLocale {
  language: string
  script?: string
  region?: string
}

/**
 * Parse a BCP 47 locale string into its components.
 *
 * Examples:
 * - `'en'` -> `{ language: 'en' }`
 * - `'en-US'` -> `{ language: 'en', region: 'US' }`
 * - `'zh-Hans-CN'` -> `{ language: 'zh', script: 'Hans', region: 'CN' }`
 */
export function parseLocale(locale: Locale): ParsedLocale {
  const parts = locale.split('-')
  const result: ParsedLocale = { language: parts[0]!.toLowerCase() }

  if (parts.length === 2) {
    // Could be script (4 chars, title case) or region (2-3 chars)
    if (parts[1]!.length === 4) {
      result.script = parts[1]![0]!.toUpperCase() + parts[1]!.slice(1).toLowerCase()
    } else {
      result.region = parts[1]!.toUpperCase()
    }
  } else if (parts.length >= 3) {
    result.script = parts[1]![0]!.toUpperCase() + parts[1]!.slice(1).toLowerCase()
    result.region = parts[2]!.toUpperCase()
  }

  return result
}

/**
 * Normalize a locale string to a canonical form.
 */
function normalizeLocale(locale: Locale): string {
  const parsed = parseLocale(locale)
  let result = parsed.language
  if (parsed.script) result += `-${parsed.script}`
  if (parsed.region) result += `-${parsed.region}`
  return result
}

/**
 * Negotiate the best locale from the requested locale(s) against
 * the available locales list. Falls back to the provided fallback
 * or the first available locale.
 *
 * Matching strategy:
 * 1. Exact match (case-insensitive)
 * 2. Language + region match
 * 3. Language-only match
 *
 * @param requested - Single locale or ordered list of preferred locales
 * @param available - List of supported locales
 * @param fallback - Fallback locale if no match is found
 * @returns Best matching locale
 */
export function negotiateLocale(
  requested: Locale | Locale[],
  available: Locale[],
  fallback?: Locale,
): Locale {
  const requestedList = Array.isArray(requested) ? requested : [requested]

  if (available.length === 0) {
    return fallback ?? requestedList[0]!
  }

  // Build normalized lookup
  const normalizedMap = new Map<string, Locale>()
  for (const loc of available) {
    normalizedMap.set(normalizeLocale(loc).toLowerCase(), loc)
  }

  for (const req of requestedList) {
    const normalized = normalizeLocale(req).toLowerCase()

    // Exact match
    if (normalizedMap.has(normalized)) {
      return normalizedMap.get(normalized)!
    }

    // Language + region match (try without script)
    const parsed = parseLocale(req)
    if (parsed.region) {
      const langRegion = `${parsed.language}-${parsed.region}`.toLowerCase()
      if (normalizedMap.has(langRegion)) {
        return normalizedMap.get(langRegion)!
      }
    }

    // Language-only match
    for (const [key, loc] of normalizedMap) {
      if (key.startsWith(parsed.language + '-') || key === parsed.language) {
        return loc
      }
    }
  }

  return fallback ?? available[0]!
}
