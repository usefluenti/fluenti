import { useI18n } from '../use-i18n'

export interface DateTimeProps {
  /** Date value to format */
  value: Date | number
  /** Named format style */
  style?: string
}

/**
 * `<DateTime>` — date formatting component using Intl APIs.
 *
 * @example
 * ```tsx
 * <DateTime value={new Date()} style="long" />
 * ```
 */
export function DateTime(props: DateTimeProps) {
  const { d } = useI18n()
  return <>{d(props.value, props.style)}</>
}
