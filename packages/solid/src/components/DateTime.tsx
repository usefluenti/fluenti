import { useI18n } from '../use-i18n'

export interface DateTimeProps {
  /** Date value to format */
  value: Date | number
  /** Named format key defined in dateFormats config */
  format?: string
}

/** @alias DateTimeProps */
export type FluentiDateTimeProps = DateTimeProps

/**
 * `<DateTime>` — date formatting component using Intl APIs.
 *
 * @example
 * ```tsx
 * <DateTime value={new Date()} format="long" />
 * ```
 */
export function DateTime(props: DateTimeProps) {
  const { d } = useI18n()
  return <>{d(props.value, props.format)}</>
}
