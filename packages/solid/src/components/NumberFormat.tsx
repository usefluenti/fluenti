import { useI18n } from '../use-i18n'

export interface NumberProps {
  /** Number value to format */
  value: number
  /** Named format key defined in numberFormats config */
  format?: string
}

/** @alias NumberProps */
export type FluentiNumberFormatProps = NumberProps

/**
 * `<NumberFormat>` — number formatting component using Intl APIs.
 *
 * @example
 * ```tsx
 * <NumberFormat value={1234.56} format="currency" />
 * ```
 */
export function NumberFormat(props: NumberProps) {
  const { n } = useI18n()
  return <>{n(props.value, props.format)}</>
}
