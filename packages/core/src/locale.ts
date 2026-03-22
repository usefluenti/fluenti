import type { Locale } from './types'

/**
 * BCP 47 locale format: 2-3 letter language, optionally followed by
 * hyphen-separated subtags (script, region, variants) each 1-8 alphanumeric chars.
 */
const LOCALE_RE = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{1,8})*$/

/** BCP 47 script subtags are exactly 4 alphabetic characters (e.g. Hans, Latn). */
const SCRIPT_RE = /^[a-zA-Z]{4}$/

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
    // Script subtags are exactly 4 alphabetic chars (e.g. Hans, Latn).
    // 4-char subtags that contain digits (e.g. 1901) are variants, not scripts.
    if (SCRIPT_RE.test(parts[1]!)) {
      result.script = parts[1]![0]!.toUpperCase() + parts[1]!.slice(1).toLowerCase()
    } else {
      result.region = parts[1]!.toUpperCase()
    }
  } else if (parts.length >= 3) {
    if (SCRIPT_RE.test(parts[1]!)) {
      result.script = parts[1]![0]!.toUpperCase() + parts[1]!.slice(1).toLowerCase()
      result.region = parts[2]!.toUpperCase()
    } else {
      // parts[1] is not a script (e.g. variant or region), treat parts[1] as region
      result.region = parts[1]!.toUpperCase()
    }
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

/**
 * RTL (right-to-left) language codes.
 *
 * Covers all living languages with significant digital presence that use
 * RTL scripts: Arabic, Hebrew, Persian/Dari, Urdu, Pashto, Sindhi,
 * Uyghur, Kurdish (Sorani), Dhivehi/Maldivian, Yiddish, and N'Ko.
 */
const RTL_LANGUAGES = new Set([
  'ar',  // Arabic
  'he',  // Hebrew
  'fa',  // Persian (Farsi) / Dari
  'ur',  // Urdu
  'ps',  // Pashto
  'sd',  // Sindhi
  'ug',  // Uyghur
  'ckb', // Central Kurdish (Sorani)
  'dv',  // Dhivehi / Maldivian
  'yi',  // Yiddish
  'nqo', // N'Ko
])

/**
 * Check whether a locale uses a right-to-left script.
 *
 * @example
 * ```ts
 * isRTL('ar')    // true
 * isRTL('ar-SA') // true
 * isRTL('en')    // false
 * isRTL('he')    // true
 * ```
 */
export function isRTL(locale: Locale): boolean {
  const language = parseLocale(locale).language
  return RTL_LANGUAGES.has(language)
}

/**
 * Get the text direction for a locale: `'rtl'` or `'ltr'`.
 *
 * @example
 * ```tsx
 * <html lang={locale} dir={getDirection(locale)}>
 * ```
 */
export function getDirection(locale: Locale): 'rtl' | 'ltr' {
  return isRTL(locale) ? 'rtl' : 'ltr'
}

/**
 * Validate that a locale string is well-formed (basic BCP 47 check).
 *
 * This performs a lightweight structural check (2-3 letter language code
 * with optional hyphen-separated subtags of 1-8 alphanumeric chars).
 * It does **not** validate against the IANA Language Subtag Registry
 * or enforce strict subtag ordering (script before region).
 *
 * For most i18n use cases (e.g., `en`, `en-US`, `zh-Hans-CN`) this is
 * sufficient. Use a dedicated BCP 47 validation library if you need
 * full RFC 5646 compliance.
 *
 * @throws {Error} If locale is empty, not a string, or fails the basic pattern check
 */
export function validateLocale(locale: string, context: string): void {
  if (typeof locale !== 'string' || locale.trim() === '') {
    throw new Error(`[fluenti] ${context}: locale must be a non-empty string, got ${JSON.stringify(locale)}`)
  }
  if (!LOCALE_RE.test(locale)) {
    throw new Error(`[fluenti] ${context}: locale must be a valid BCP 47 tag (e.g. "en", "en-US"), got ${JSON.stringify(locale)}`)
  }
}
