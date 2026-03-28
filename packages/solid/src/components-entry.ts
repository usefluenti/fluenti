export { Trans } from './trans'
export type { FluentiTransProps } from './trans'
export { Plural } from './plural'
export type { FluentiPluralProps } from './plural'
export { SelectComp as Select } from './select'
export type { FluentiSelectProps } from './select'
export { DateTime } from './components/DateTime'
export type { DateTimeProps, FluentiDateTimeProps } from './components/DateTime'
export { NumberFormat } from './components/NumberFormat'
export type { NumberProps, FluentiNumberFormatProps } from './components/NumberFormat'

// Re-export interpolate for apps that use <Plural>/<Select> at runtime
export { interpolate } from '@fluenti/core/internal'
