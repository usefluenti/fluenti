import type { Locale } from '../types'

interface TimeUnit {
  unit: Intl.RelativeTimeFormatUnit
  ms: number
}

const UNITS: TimeUnit[] = [
  { unit: 'year', ms: 365.25 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30.44 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
  { unit: 'second', ms: 1000 },
]

/**
 * Format a date as a relative time string (e.g. "2 days ago", "in 3 hours").
 *
 * Automatically selects the best unit based on the time difference.
 * Uses `Intl.RelativeTimeFormat` for locale-aware output.
 *
 * @param value - Date object or timestamp to compare against now
 * @param locale - BCP 47 locale string
 * @returns Relative time string
 */
export function formatRelativeTime(value: Date | number, locale: Locale): string {
  const ms = (value instanceof Date ? value.getTime() : value) - Date.now()
  const absMs = Math.abs(ms)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  for (const { unit, ms: unitMs } of UNITS) {
    if (absMs >= unitMs || unit === 'second') {
      const amount = Math.round(ms / unitMs)
      return rtf.format(amount, unit)
    }
  }

  return rtf.format(0, 'second')
}
