import type { Component, JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { hashMessage } from '@fluenti/core'
import { useI18n } from './use-i18n'
import { buildICUSelectMessage, normalizeSelectForms } from '@fluenti/core'
import { reconstruct, serializeRichForms } from './rich-dom'

/** Props for the `<Select>` component */
export interface SelectProps {
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
 */
export const SelectComp: Component<SelectProps> = (props) => {
  const { t } = useI18n()

  const content = () => {
    const forms: Record<string, unknown> = props.options !== undefined
      ? { ...props.options, other: props.other }
      : {
        ...Object.fromEntries(
          Object.entries(props).filter(([key]) => !['value', 'id', 'context', 'comment', 'options', 'other', 'tag'].includes(key)),
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
