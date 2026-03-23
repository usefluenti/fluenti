"use client"

// Factory
export { createFluenti } from './create-fluenti'
export type { FluentiConfig, FluentiInstance } from './create-fluenti'

// Provider
export { I18nProvider } from './provider'

// Context (for advanced use cases)
export { I18nContext } from './context'

// Hooks
export { useI18n } from './hooks/useI18n'
export { t } from './compile-time-t'

// Components
export { Trans } from './components/Trans'
export { Plural } from './components/Plural'
export { Select } from './components/Select'
export { DateTime } from './components/DateTime'
export { NumberFormat } from './components/Number'

// Lazy messages
export { msg } from './msg'

// Types
export type {
  FluentiContext,
  I18nProviderProps,
  Messages,
  AllMessages,
  MessageDescriptor,
  CompileTimeMessageDescriptor,
  CompileTimeT,
  Locale,
  DateFormatOptions,
  NumberFormatOptions,
} from './types'
export type { FluentiTransProps } from './components/Trans'
export type { FluentiPluralProps } from './components/Plural'
export type { FluentiSelectProps } from './components/Select'
export type { FluentiDateTimeProps } from './components/DateTime'
export type { NumberFormatProps } from './components/Number'
