import { Dynamic } from 'solid-js/web'
import type { Component, JSX } from 'solid-js'
import { hashMessage, buildICUPluralMessage, PLURAL_CATEGORIES, type PluralCategory } from '@fluenti/core'
import { useI18n } from './use-i18n'
import { reconstruct, serializeRichForms } from './rich-dom'

/** Props for the `<Plural>` component */
export interface PluralProps {
  /** The numeric value to pluralise */
  value: number
  /** Override the auto-generated synthetic ICU message id */
  id?: string
  /** Message context used for identity and translator disambiguation */
  context?: string
  /** Translator-facing note preserved in extraction catalogs */
  comment?: string
  /** Offset from value before selecting form */
  offset?: number
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
  /** Wrapper element tag name. Defaults to no wrapper (Fragment). */
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
  const { t } = useI18n()

  /** Resolve a category prop value — handles string, accessor function, and JSX */
  function resolveProp(val: string | JSX.Element | undefined): string | JSX.Element | undefined {
    if (typeof val === 'function') return (val as () => string | JSX.Element)()
    return val
  }

  return (() => {
    // Resolve all category values (handles Solid accessors from createMemo)
    const resolvedValues: Partial<Record<PluralCategory, string | JSX.Element>> = {}
    for (const cat of PLURAL_CATEGORIES) {
      const resolved = resolveProp(props[cat])
      if (resolved !== undefined) {
        resolvedValues[cat] = resolved
      }
    }
    const { messages, components } = serializeRichForms(PLURAL_CATEGORIES, resolvedValues)
    const icuMessage = buildICUPluralMessage(
      {
        ...(messages['zero'] !== undefined && { zero: messages['zero'] }),
        ...(messages['one'] !== undefined && { one: messages['one'] }),
        ...(messages['two'] !== undefined && { two: messages['two'] }),
        ...(messages['few'] !== undefined && { few: messages['few'] }),
        ...(messages['many'] !== undefined && { many: messages['many'] }),
        other: messages['other'] ?? '',
      },
      props.offset,
    )

    const translated = t(
      {
        id: props.id ?? (props.context === undefined ? icuMessage : hashMessage(icuMessage, props.context)),
        message: icuMessage,
        ...(props.context !== undefined ? { context: props.context } : {}),
        ...(props.comment !== undefined ? { comment: props.comment } : {}),
      },
      { count: props.value },
    )

    const result = components.length > 0 ? reconstruct(translated, components) : translated
    if (props.tag) {
      return (<Dynamic component={props.tag}>{result}</Dynamic>) as JSX.Element
    }
    return (<>{result}</>) as JSX.Element
  }) as unknown as JSX.Element
}
