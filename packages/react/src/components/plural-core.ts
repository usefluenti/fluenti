import type { ReactNode } from 'react'
import type { PluralCategory } from '@fluenti/core'

export { PLURAL_CATEGORIES, type PluralCategory } from '@fluenti/core'

/**
 * Resolve which plural category to use.
 * Checks for exact =0 match first, then falls back to CLDR rules.
 * @internal
 */
export function resolveCategory(
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
export function replaceHash(node: ReactNode, formatted: string): ReactNode {
  if (typeof node === 'string') {
    return node.replace(/#/g, formatted)
  }
  return node
}
