export { createFluenti, FLUENTI_KEY } from './plugin'
export type { FluentiConfig, FluentiPlugin, FluentiContext } from './plugin'
export { useI18n, useLocale } from './use-i18n'
export { t } from './compile-time-t'
export { msg } from './msg'

// Trans is compile-time — safe to export from main entry
export { Trans } from './components/Trans'

// Plural, Select, DateTime, NumberFormat require @fluenti/vue/components
export type { FluentiTransProps } from './components/Trans'
export type { FluentiPluralProps } from './components/Plural'
export type { FluentiSelectProps } from './components/Select'
export type { FluentiDateTimeProps } from './components/DateTime'
export type { FluentiNumberFormatProps } from './components/NumberFormat'

