import { useContext } from 'react'
import { I18nContext } from '../context'

export interface NumberProps {
  /** Number value to format */
  value: number
  /** Named format style */
  style?: string
}

/**
 * `<Number>` — number formatting component using Intl APIs.
 *
 * @example
 * ```tsx
 * <Number value={1234.56} style="currency" />
 * ```
 */
export function NumberFormat({ value, style }: NumberProps) {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('[fluenti] <Number> must be used within an <I18nProvider>')
  }
  return <>{ctx.i18n.n(value, style)}</>
}
