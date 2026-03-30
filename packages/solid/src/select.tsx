import type { Component, JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { hashMessage, buildICUSelectMessage, normalizeSelectForms } from '@fluenti/core/internal'
import { useI18n } from './use-i18n'
import { reconstruct, serializeRichForms } from './rich-dom'

/** Props for the `<Select>` component */
export interface FluentiSelectProps {
  /** The value to match against prop keys */
  value: string
  /** Override the auto-generated synthetic ICU message id */
  id?: string
  /** Message context used for identity and translator disambiguation */
  context?: string
  /** Translator-facing note preserved in extraction catalogs */
  comment?: string
  /** Fallback message when no key matches */
  other: string | JSX.Element
  /**
   * Named options map. Keys are match values, values are display strings or JSX.
   * Takes precedence over dynamic attrs when both are provided.
   *
   * @example `{ male: 'He', female: 'She' }`
   */
  options?: Record<string, string | JSX.Element>
  /** Wrapper element tag name. Defaults to no wrapper (Fragment). */
  tag?: string
  /** Additional key/message pairs for matching (attrs fallback) */
  [key: string]: unknown
}

/**
 * Render a message selected by matching `value` against prop keys.
 *
 * Options can be provided via the type-safe `options` prop (recommended)
 * or as direct attrs (convenience). When both are present, `options` takes
 * precedence.
 *
 * Rich text is supported via JSX element values in the `options` prop or
 * as direct JSX element props:
 * ```tsx
 * <Select
 *   value={gender()}
 *   options={{
 *     male: <><strong>He</strong> liked this</>,
 *     female: <><strong>She</strong> liked this</>,
 *   }}
 *   other={<><em>They</em> liked this</>}
 * />
 * ```
 *
 * Falls back to the `other` prop when no key matches.
 *
 * @example
 * ```tsx
 * import { Select } from '@fluenti/solid'
 *
 * function Greeting(props: { gender: string }) {
 *   return (
 *     <Select value={props.gender}
 *       male="He liked your post"
 *       female="She liked your post"
 *       other="They liked your post"
 *     />
 *   )
 * }
 * ```
 */
export const SelectComp: Component<FluentiSelectProps> = (props) => {
  const { t } = useI18n()

  const content = () => {
    const RESERVED_KEYS = new Set(['value', 'id', 'context', 'comment', 'options', 'other', 'tag', 'children', 'ref', 'class', 'className', 'style', 'classList', 'on', 'oncapture', 'use', 'prop'])
    const forms: Record<string, unknown> = props.options !== undefined
      ? { ...props.options, other: props.other }
      : {
        ...Object.fromEntries(
          Object.entries(props).filter(([key]) =>
            !RESERVED_KEYS.has(key)
            && !key.startsWith('data-')
            && !key.startsWith('aria-')
            && !key.startsWith('on'),
          ),
        ),
        other: props.other,
      }

    const orderedKeys = [...Object.keys(forms).filter(key => key !== 'other'), 'other'] as const
    const { messages, components } = serializeRichForms(orderedKeys, forms)
    const normalized = normalizeSelectForms(
      Object.fromEntries([...orderedKeys].map((key) => [key, messages[key] ?? ''])),
    )
    const translated = t(
      {
        id: props.id ?? (props.context === undefined
          ? buildICUSelectMessage(normalized.forms)
          : hashMessage(buildICUSelectMessage(normalized.forms), props.context)),
        message: buildICUSelectMessage(normalized.forms),
        ...(props.context !== undefined ? { context: props.context } : {}),
        ...(props.comment !== undefined ? { comment: props.comment } : {}),
      },
      { value: normalized.valueMap[props.value] ?? 'other' },
    )

    return components.length > 0 ? reconstruct(translated, components) : translated
  }

  return (() => {
    if (props.tag) {
      return (<Dynamic component={props.tag}>{content()}</Dynamic>) as JSX.Element
    }
    return (<>{content()}</>) as JSX.Element
  }) as unknown as JSX.Element
}
