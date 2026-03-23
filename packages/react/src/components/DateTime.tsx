import { memo, useContext } from 'react'
import { I18nContext } from '../context'

export interface FluentiDateTimeProps {
  /** Date value to format */
  value: Date | number
  /** Named format style */
  style?: string
}

/**
 * `<DateTime>` — formatting component using Intl APIs.
 *
 * @example
 * ```tsx
 * <DateTime value={new Date()} style="long" />
 * ```
 */
export const DateTime = memo(function DateTime({ value, style }: FluentiDateTimeProps) {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('[fluenti] <DateTime> must be used within an <I18nProvider>')
  }
  return <>{ctx.d(value, style)}</>
})
