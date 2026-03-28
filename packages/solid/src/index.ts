export { createFluentiContext } from './context'
export type { FluentiContext, FluentiConfig } from './context'
export { I18nProvider } from './provider'
export { useI18n } from './use-i18n'
export { t } from './compile-time-t'
export { msg } from './msg'

// Components moved to @fluenti/solid/components:
//   import { Trans, Plural, Select, DateTime, NumberFormat } from '@fluenti/solid/components'
export type { FluentiTransProps } from './trans'
export type { FluentiPluralProps } from './plural'
export type { FluentiSelectProps } from './select'
export type { DateTimeProps, FluentiDateTimeProps } from './components/DateTime'
export type { NumberProps, FluentiNumberFormatProps } from './components/NumberFormat'

