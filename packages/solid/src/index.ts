export { createFluentiContext } from './context'
export type { FluentiContext, FluentiConfig } from './context'
export { I18nProvider } from './provider'
export { useI18n, useLocale } from './use-i18n'
export { t } from './compile-time-t'
export { msg } from './msg'

// Components — all available from main entry
export { Trans } from './trans'
export { Plural } from './plural'
export { SelectComp as Select } from './select'
export { DateTime } from './components/DateTime'
export { NumberFormat } from './components/NumberFormat'

export type { FluentiTransProps } from './trans'
export type { FluentiPluralProps } from './plural'
export type { FluentiSelectProps } from './select'
export type { DateTimeProps, FluentiDateTimeProps } from './components/DateTime'
export type { NumberProps, FluentiNumberFormatProps } from './components/NumberFormat'

