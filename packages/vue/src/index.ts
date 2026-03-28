export { createFluenti, FLUENTI_KEY } from './plugin'
export type { FluentiConfig, FluentiPlugin, FluentiContext } from './plugin'
export { useI18n } from './use-i18n'
export { t } from './compile-time-t'
export { msg } from './msg'

// Components moved to @fluenti/vue/components:
//   import { Trans, Plural, Select, DateTime, NumberFormat } from '@fluenti/vue/components'
export type { FluentiTransProps } from './components/Trans'
export type { FluentiPluralProps } from './components/Plural'
export type { FluentiSelectProps } from './components/Select'
export type { FluentiDateTimeProps } from './components/DateTime'
export type { FluentiNumberFormatProps } from './components/NumberFormat'

// Re-export interpolate for apps that use <Plural>/<Select> at runtime
export { interpolate } from '@fluenti/core/internal'
