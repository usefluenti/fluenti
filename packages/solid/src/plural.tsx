import { Dynamic } from 'solid-js/web'
import type { Component, JSX } from 'solid-js'
import { buildICUPluralMessage, PLURAL_CATEGORIES, type PluralCategory } from '@fluenti/core/runtime'
import { useI18n } from './use-i18n'
import { reconstruct, serializeRichForms } from './rich-dom'
import { buildPlainPluralMessage, resolveCompiledMessageId, resolvePropValue } from './plain-runtime'

/** Props for the `<Plural>` component */
export interface FluentiPluralProps {
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
 *
 * @example
 * ```tsx
 * import { Plural } from '@fluenti/solid/components'
 *
 * function ItemCount(props: { count: number }) {
 *   return <Plural value={props.count} one="# item" other="# items" />
 * }
 * ```
 */
export const Plural: Component<FluentiPluralProps> = (props) => {
  const { t } = useI18n()

  return (() => {
    const resolvedValues: Partial<Record<PluralCategory, string | JSX.Element>> = {}
    for (const cat of PLURAL_CATEGORIES) {
      const resolved = resolvePropValue(props[cat]) as string | JSX.Element | undefined
      if (resolved !== undefined) {
        resolvedValues[cat] = resolved
      }
    }
    const plainMessage = buildPlainPluralMessage(resolvedValues, props.offset)
    if (plainMessage !== undefined) {
      const translated = t(
        {
          id: resolveCompiledMessageId(props.id, plainMessage, props.context),
          message: plainMessage,
          ...(props.context !== undefined ? { context: props.context } : {}),
          ...(props.comment !== undefined ? { comment: props.comment } : {}),
        },
        { count: props.value },
      )

      if (props.tag) {
        return (<Dynamic component={props.tag}>{translated}</Dynamic>) as JSX.Element
      }
      return (<>{translated}</>) as JSX.Element
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
        id: resolveCompiledMessageId(props.id, icuMessage, props.context),
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
