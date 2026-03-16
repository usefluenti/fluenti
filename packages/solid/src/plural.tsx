import { Dynamic } from 'solid-js/web'
import type { Component, JSX } from 'solid-js'
import { interpolate } from '@fluenti/core'
import { useI18n } from './use-i18n'

/** Plural category names in a stable order for ICU message building. */
const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const

type PluralCategory = (typeof PLURAL_CATEGORIES)[number]

/**
 * Build an ICU plural message string from individual category props.
 *
 * Given `{ zero: "No items", one: "# item", other: "# items" }`,
 * produces `"{count, plural, =0 {No items} one {# item} other {# items}}"`.
 *
 * @internal
 */
function buildICUPluralMessage(
  forms: Partial<Record<PluralCategory, string>> & { other: string },
): string {
  const parts: string[] = []
  for (const cat of PLURAL_CATEGORIES) {
    const text = forms[cat]
    if (text !== undefined) {
      // Map the `zero` prop to ICU `=0` exact match. In ICU MessageFormat,
      // `zero` is a CLDR plural category that only activates in languages
      // with a grammatical zero form (e.g. Arabic). The `=0` exact match
      // works universally for the common "show this when count is 0" intent.
      const key = cat === 'zero' ? '=0' : cat
      parts.push(`${key} {${text}}`)
    }
  }
  return `{count, plural, ${parts.join(' ')}}`
}

/**
 * Resolve which plural category to use for rich content rendering.
 * Checks for exact =0 match first, then falls back to CLDR rules.
 * @internal
 */
function resolveCategory(
  value: number,
  locale: string,
  available: (cat: PluralCategory) => boolean,
): PluralCategory {
  if (value === 0 && available('zero')) return 'zero'
  const cldr = new Intl.PluralRules(locale).select(value) as PluralCategory
  if (available(cldr)) return cldr
  return 'other'
}

/** Props for the `<Plural>` component */
export interface PluralProps {
  /** The numeric value to pluralise */
  value: number
  /** Message for the "zero" plural category */
  zero?: string | JSX.Element
  /** Message for the "one" plural category */
  one?: string | JSX.Element
  /** Message for the "two" plural category */
  two?: string | JSX.Element
  /** Message for the "few" plural category */
  few?: string | JSX.Element
  /** Message for the "many" plural category */
  many?: string | JSX.Element
  /** Fallback message when no category-specific prop matches */
  other: string | JSX.Element
  /** Wrapper element tag name (default: `'span'`) */
  tag?: string
}

/**
 * `<Plural>` component — shorthand for ICU plural patterns.
 *
 * Plural form props (`zero`, `one`, `two`, `few`, `many`, `other`) are treated
 * as source-language messages. The component builds an ICU plural message,
 * looks it up via `t()` in the catalog, and interpolates the translated result.
 *
 * When no catalog translation exists, the component falls back to interpolating
 * the source-language ICU message directly via core's `interpolate`.
 *
 * Rich text is supported via JSX element props:
 * ```tsx
 * <Plural
 *   value={count()}
 *   zero={<>No <strong>items</strong> left</>}
 *   one={<><em>1</em> item remaining</>}
 *   other={<><strong>{count()}</strong> items remaining</>}
 * />
 * ```
 *
 * String props still work (backward compatible):
 * ```tsx
 * <Plural value={count()} zero="No items" one="# item" other="# items" />
 * ```
 */
export const Plural: Component<PluralProps> = (props) => {
  const { t, locale } = useI18n()

  /** Resolve a category prop value — handles string, accessor function, and JSX */
  function resolveProp(val: string | JSX.Element | undefined): string | JSX.Element | undefined {
    if (typeof val === 'function') return (val as () => string | JSX.Element)()
    return val
  }

  return (() => {
    const currentLocale = locale()

    // Resolve all category values (handles Solid accessors from createMemo)
    const resolvedValues: Partial<Record<PluralCategory, string | JSX.Element>> = {}
    for (const cat of PLURAL_CATEGORIES) {
      const resolved = resolveProp(props[cat])
      if (resolved !== undefined) {
        resolvedValues[cat] = resolved
      }
    }

    // Check if any category prop contains JSX (non-string) content
    const hasRichContent = PLURAL_CATEGORIES.some(cat => {
      const val = resolvedValues[cat]
      return val !== undefined && typeof val !== 'string'
    })

    if (hasRichContent) {
      const cat = resolveCategory(props.value, currentLocale, c => resolvedValues[c] !== undefined)
      const content = resolvedValues[cat] ?? resolvedValues.other ?? props.other
      return (<Dynamic component={props.tag ?? 'span'}>{content}</Dynamic>) as JSX.Element
    }

    // Existing string ICU path
    const forms: Partial<Record<PluralCategory, string>> & { other: string } = {
      ...(resolvedValues.zero !== undefined && { zero: resolvedValues.zero as string }),
      ...(resolvedValues.one !== undefined && { one: resolvedValues.one as string }),
      ...(resolvedValues.two !== undefined && { two: resolvedValues.two as string }),
      ...(resolvedValues.few !== undefined && { few: resolvedValues.few as string }),
      ...(resolvedValues.many !== undefined && { many: resolvedValues.many as string }),
      other: (resolvedValues.other ?? props.other) as string,
    }

    // Build the ICU message key from source-language props
    const icuMessage = buildICUPluralMessage(forms)

    // Use t() for catalog lookup — if a translation exists for this ICU key,
    // it will be returned (as a compiled function result). If not found, t()
    // now falls back to interpolating inline ICU via core's interpolate.
    const text = t(icuMessage, { count: props.value })

    return (<Dynamic component={props.tag ?? 'span'}>{text}</Dynamic>) as JSX.Element
  }) as unknown as JSX.Element
}
