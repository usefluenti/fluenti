import { memo, useContext } from 'react'
import { I18nContext } from '../context'

export interface FluentiDateTimeProps {
  /** Date value to format */
  value: Date | number
  /** Named format key defined in dateFormats config */
  format?: string
}

/**
 * `<DateTime>` — formatting component using Intl APIs.
 *
 * @example
 * ```tsx
 * <DateTime value={new Date()} format="long" />
 * ```
 */
export const DateTime = memo(function DateTime({ value, format }: FluentiDateTimeProps) {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('[fluenti] <DateTime> must be used within an <I18nProvider>')
  }
  return <>{ctx.d(value, format)}</>
})
