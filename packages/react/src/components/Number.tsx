import { memo, useContext } from 'react'
import { I18nContext } from '../context'

export interface NumberFormatProps {
  /** Number value to format */
  value: number
  /** Named format key defined in numberFormats config */
  format?: string
}

/** @alias NumberFormatProps */
export type FluentiNumberFormatProps = NumberFormatProps

/**
 * `<Number>` — number formatting component using Intl APIs.
 *
 * @example
 * ```tsx
 * <Number value={1234.56} format="currency" />
 * ```
 */
export const NumberFormat = /* @__PURE__ */ memo(function NumberFormat({ value, format }: NumberFormatProps) {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('[fluenti] <Number> must be used within an <I18nProvider>')
  }
  return <>{ctx.n(value, format)}</>
})
