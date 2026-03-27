/**
 * Intl-based formatters for dates, numbers, and relative time.
 *
 * Import from `@fluenti/core/formatters` to keep the client bundle lean.
 *
 * @module
 */
export { formatNumber, DEFAULT_NUMBER_FORMATS, clearNumberFormatCache, LOCALE_CURRENCY_MAP } from './formatters/number'
export { formatDate, DEFAULT_DATE_FORMATS, clearDateFormatCache } from './formatters/date'
export { formatRelativeTime, clearRelativeTimeFormatCache } from './formatters/relative'
export type { DateFormatOptions, NumberFormatOptions, FormatDateFn, FormatNumberFn } from './types'
