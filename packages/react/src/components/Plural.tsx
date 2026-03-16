import { memo, useContext, type ReactNode } from 'react'
import { I18nContext } from '../context'
import { resolveCategory, replaceHash, type PluralCategory } from './plural-core'

export interface PluralProps {
  /** The count value */
  value: number
  /** Text for zero (if language supports) */
  zero?: ReactNode
  /** Singular form. `#` replaced with value */
  one?: ReactNode
  /** Dual form (Arabic, etc.) */
  two?: ReactNode
  /** Few form (Slavic languages, etc.) */
  few?: ReactNode
  /** Many form */
  many?: ReactNode
  /** Default plural form */
  other: ReactNode
  /** Offset from value before selecting form */
  offset?: number
}

/**
 * `<Plural>` — ICU plural handling as a component.
 *
 * @example
 * ```tsx
 * <Plural value={count} zero="No messages" one="# message" other="# messages" />
 * ```
 */
export const Plural = memo(function Plural({ value, zero, one, two, few, many, other, offset }: PluralProps) {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('[fluenti] <Plural> must be used within an <I18nProvider>')
  }

  const adjustedValue = offset ? value - offset : value
  const locale = ctx.locale

  const available: Record<string, boolean> = {
    zero: zero !== undefined,
    one: one !== undefined,
    two: two !== undefined,
    few: few !== undefined,
    many: many !== undefined,
    other: true,
  }

  const category = resolveCategory(adjustedValue, locale, available)

  const forms: Record<PluralCategory, ReactNode | undefined> = {
    zero,
    one,
    two,
    few,
    many,
    other,
  }

  const selected = forms[category] ?? other
  const formatted = ctx.i18n.n(value)

  return <>{replaceHash(selected, formatted)}</>
})
