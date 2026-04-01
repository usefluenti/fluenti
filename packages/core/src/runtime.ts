/**
 * Runtime helpers for application code and framework bindings.
 *
 * Import from `@fluenti/core/runtime` when you need runtime ICU support,
 * formatter helpers, or component-facing message utilities without exposing
 * parser/compiler APIs to the client bundle.
 */

// Message identity helpers used by runtime components.
export { hashMessage, resolveDescriptorId } from './identity'

// Runtime ICU helpers used by framework components and rich text renderers.
export { buildICUMessage } from './msg'
export {
  PLURAL_CATEGORIES,
  buildICUPluralMessage,
  buildICUSelectMessage,
  normalizeSelectForms,
  offsetIndices,
} from './icu-builders'
export type { PluralCategory } from './icu-builders'

// ICU interpolation/runtime formatting.
export {
  interpolate,
  clearInterpolationCache,
  setMessageCacheSize,
  DEFAULT_MESSAGE_CACHE_SIZE,
} from './interpolate'
export { resolvePlural, resolvePluralCategory, clearPluralCache } from './plural'
export { Catalog } from './catalog'

// Intl helpers and cache controls.
export {
  formatNumber,
  DEFAULT_NUMBER_FORMATS,
  clearNumberFormatCache,
  LOCALE_CURRENCY_MAP,
} from './formatters/number'
export {
  formatDate,
  DEFAULT_DATE_FORMATS,
  clearDateFormatCache,
} from './formatters/date'
export {
  formatRelativeTime,
  clearRelativeTimeFormatCache,
} from './formatters/relative'

// Diagnostics are runtime-safe and useful for apps.
export { createDiagnostics } from './diagnostics'
export type { DiagnosticsConfig, DiagnosticEvent, Diagnostics } from './diagnostics'

export type {
  Locale,
  LocalizedString,
  Messages,
  MessageDescriptor,
  CompiledMessage,
  CustomFormatter,
  DateFormatOptions,
  NumberFormatOptions,
  FormatDateFn,
  FormatNumberFn,
} from './types'
