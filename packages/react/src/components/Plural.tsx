import { useContext, type ReactNode } from 'react'
import { I18nContext } from '../context'

const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const
type PluralCategory = (typeof PLURAL_CATEGORIES)[number]

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
 * Resolve which plural category to use.
 * Checks for exact =0 match first, then falls back to CLDR rules.
 * @internal
 */
function resolveCategory(
  value: number,
  locale: string,
  available: Record<string, boolean>,
): PluralCategory {
  if (value === 0 && available['zero']) return 'zero'
  const cldr = new Intl.PluralRules(locale).select(value) as PluralCategory
  if (available[cldr]) return cldr
  return 'other'
}

/**
 * Replace `#` with the formatted value in a ReactNode.
 * @internal
 */
function replaceHash(node: ReactNode, formatted: string): ReactNode {
  if (typeof node === 'string') {
    return node.replace(/#/g, formatted)
  }
  return node
}

/**
 * `<Plural>` — ICU plural handling as a component.
 *
 * @example
 * ```tsx
 * <Plural value={count} zero="No messages" one="# message" other="# messages" />
 * ```
 */
export function Plural({ value, zero, one, two, few, many, other, offset }: PluralProps) {
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
}
