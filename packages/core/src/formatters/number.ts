import type { Locale } from '../types'

const formatCache = new Map<string, Intl.NumberFormat>()

/**
 * Clear the cached `Intl.NumberFormat` instances used by `formatNumber()`.
 *
 * Useful for long-running Node.js servers to reclaim memory.
 */
export function clearNumberFormatCache(): void {
  formatCache.clear()
}

/** Map locale → default currency code */
export const LOCALE_CURRENCY_MAP: Record<string, string> = {
  'en': 'USD', 'en-US': 'USD', 'en-GB': 'GBP', 'en-AU': 'AUD', 'en-CA': 'CAD',
  'zh-CN': 'CNY', 'zh-TW': 'TWD', 'zh-HK': 'HKD',
  'ja': 'JPY', 'ja-JP': 'JPY',
  'ko': 'KRW', 'ko-KR': 'KRW',
  'de': 'EUR', 'de-DE': 'EUR', 'de-AT': 'EUR',
  'fr': 'EUR', 'fr-FR': 'EUR', 'fr-CA': 'CAD',
  'es': 'EUR', 'es-ES': 'EUR', 'es-MX': 'MXN',
  'pt': 'EUR', 'pt-BR': 'BRL', 'pt-PT': 'EUR',
  'it': 'EUR', 'ru': 'RUB', 'ar': 'SAR', 'hi': 'INR',
}

/** Built-in number format styles. Used when no custom styles are provided. */
export const DEFAULT_NUMBER_FORMATS: Record<string, Intl.NumberFormatOptions | ((locale: Locale) => Intl.NumberFormatOptions)> = {
  default: {},
  currency: (locale: string) => ({
    style: 'currency',
    currency: LOCALE_CURRENCY_MAP[locale] ?? LOCALE_CURRENCY_MAP[locale.split('-')[0]!] ?? 'USD',
  }),
  percent: { style: 'percent' },
  decimal: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
}

/**
 * Format a number according to locale and an optional named style.
 *
 * Named styles can be either static `Intl.NumberFormatOptions` or
 * a function that receives the locale and returns options.
 *
 * @param value - The numeric value to format
 * @param locale - BCP 47 locale string
 * @param style - Optional named style key
 * @param styles - Optional map of named styles to format options
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  locale: Locale,
  style?: string,
  styles?: Record<string, Intl.NumberFormatOptions | ((locale: Locale) => Intl.NumberFormatOptions)>,
): string {
  let options: Intl.NumberFormatOptions = {}

  // Merge user styles over defaults
  const mergedStyles = { ...DEFAULT_NUMBER_FORMATS, ...styles }
  if (style && style in mergedStyles) {
    const styleDef = mergedStyles[style]!
    options = typeof styleDef === 'function' ? styleDef(locale) : styleDef
  }

  const cacheKey = `${locale}:${JSON.stringify(options)}`
  let formatter = formatCache.get(cacheKey)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options)
    formatCache.set(cacheKey, formatter)
  }

  return formatter.format(value)
}
