import type { Component, JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { useI18n } from './use-i18n'

/** Props for the `<Select>` component */
export interface SelectProps {
  /** The value to match against prop keys */
  value: string
  /** Fallback message when no key matches */
  other: string | JSX.Element
  /**
   * Named options map. Keys are match values, values are display strings or JSX.
   * Takes precedence over dynamic attrs when both are provided.
   *
   * @example `{ male: 'He', female: 'She' }`
   */
  options?: Record<string, string | JSX.Element>
  /** Wrapper element tag name (default: `span`) */
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
  useI18n() // ensure provider is installed

  const resolvedTag = () => props.tag ?? 'span'

  const content = () => {
    // options prop takes precedence over attrs
    if (props.options !== undefined) {
      const match = props.options[props.value]
      if (match !== undefined) {
        return match
      }
      return props.other
    }

    // Fall back to attrs for backwards compatibility
    const attrMatch = props[props.value]
    if (
      attrMatch !== undefined &&
      props.value !== 'value' &&
      props.value !== 'other' &&
      props.value !== 'options' &&
      props.value !== 'tag'
    ) {
      return attrMatch
    }
    return props.other
  }

  return (<Dynamic component={resolvedTag()}>{content()}</Dynamic>) as JSX.Element
}
