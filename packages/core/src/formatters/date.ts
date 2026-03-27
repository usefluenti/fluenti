import type { Locale } from '../types'
import { formatRelativeTime } from './relative'
import { LRUCache, stableCacheKey } from '../lru'

const formatCache = new LRUCache<string, Intl.DateTimeFormat>(200)

/**
 * Clear the cached `Intl.DateTimeFormat` instances used by `formatDate()`.
 *
 * Useful for long-running Node.js servers to reclaim memory.
 */
export function clearDateFormatCache(): void {
  formatCache.clear()
}

/** @internal Built-in date format styles. Used when no custom styles are provided. */
export const DEFAULT_DATE_FORMATS: Record<string, Intl.DateTimeFormatOptions | 'relative'> = {
  default: { year: 'numeric', month: 'short', day: 'numeric' },
  short: { year: 'numeric', month: 'numeric', day: 'numeric' },
  long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
  time: { hour: 'numeric', minute: 'numeric' },
  datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' },
  relative: 'relative',
}

/**
 * Format a date according to locale and an optional named style.
 *
 * If the style maps to `'relative'`, delegates to `formatRelativeTime()`.
 *
 * @param value - Date object or timestamp
 * @param locale - BCP 47 locale string
 * @param style - Optional named style key
 * @param styles - Optional map of named styles to format options or `'relative'`
 * @returns Formatted date string
 */
export function formatDate(
  value: Date | number,
  locale: Locale,
  style?: string,
  styles?: Record<string, Intl.DateTimeFormatOptions | 'relative'>,
): string {
  // Validate input in development
  if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] !== 'production') {
    const ts = value instanceof Date ? value.getTime() : value
    if (!Number.isFinite(ts)) {
      console.warn(`[fluenti] formatDate received invalid date value: ${value}`)
    }
  }

  // Merge user styles over defaults
  const mergedStyles = { ...DEFAULT_DATE_FORMATS, ...styles }
  try {
    if (style && style in mergedStyles) {
      const styleDef = mergedStyles[style]
      if (styleDef === 'relative') {
        return formatRelativeTime(value, locale)
      }
      const options = styleDef as Intl.DateTimeFormatOptions
      const cacheKey = stableCacheKey(locale, options as Record<string, unknown>)
      let formatter = formatCache.get(cacheKey)
      if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale, options)
        formatCache.set(cacheKey, formatter)
      }
      return formatter.format(value instanceof Date ? value : new Date(value))
    }

    const cacheKey = stableCacheKey(locale)
    let formatter = formatCache.get(cacheKey)
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(locale)
      formatCache.set(cacheKey, formatter)
    }
    return formatter.format(value instanceof Date ? value : new Date(value))
  } catch (err) {
    if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] !== 'production') {
      console.warn('[fluenti] Date formatting failed:', err)
    }
    return ''
  }
}
