"use client"

// Factory
export { createFluenti } from './create-fluenti'
export type { FluentiConfig, FluentiInstance } from './create-fluenti'

// Provider
export { I18nProvider } from './provider'

// Context (for advanced use cases)
export { I18nContext } from './context'

// Hooks
export { useI18n, useLocale } from './hooks/useI18n'
export { t } from './compile-time-t'

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

// Components moved to @fluenti/react/components:
//   import { Trans, Plural, Select, DateTime, NumberFormat } from '@fluenti/react/components'
export type { FluentiTransProps } from './components/Trans'
export type { FluentiPluralProps } from './components/Plural'
export type { FluentiSelectProps } from './components/Select'
export type { FluentiDateTimeProps } from './components/DateTime'
export type { NumberFormatProps, FluentiNumberFormatProps } from './components/Number'

