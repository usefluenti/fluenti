import { Dynamic } from 'solid-js/web'
import type { Component, JSX } from 'solid-js'
import { useI18n } from './use-i18n'

/** @internal Tree-shakeable dev-mode flag. Bundlers replace or dead-code-eliminate this. */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
const __DEV__: boolean = /* @__PURE__ */ (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (globalThis as Record<string, unknown>)['process'] !== undefined
      ? ((globalThis as Record<string, unknown>)['process'] as { env: Record<string, string | undefined> }).env['NODE_ENV'] !== 'production'
      : true
  } catch {
    return true
  }
})()

/** Props for the `<Trans>` component */
export interface TransProps {
  /**
   * The message string — may contain `{var}` placeholders and `<tag>...</tag>` rich text markers.
   * @deprecated Use children instead for a simpler and more idiomatic API.
   */
  message?: string
  /** Interpolation values for `{var}` placeholders */
  values?: Record<string, unknown>
  /** Map of tag names to Solid components for rich text rendering */
  components?: Record<string, Component<{ children?: JSX.Element }>>
  /** Wrapper element tag name (default: `'span'`) */
  tag?: string
  /** Children — the recommended API for inline content */
  children?: JSX.Element
}

/**
 * Render a translated message with optional rich-text component interpolation.
 *
 * **Recommended usage** — pass children directly:
 *
 * @example
 * ```tsx
 * <Trans>Click <a href="/next">here</a> to continue</Trans>
 * ```
 *
 * **Plain mode** — when no `components` prop is provided the message is
 * interpolated via `format` and rendered as a text node.
 *
 * **Rich-text mode** — `<tag>...</tag>` markers in the message are replaced
 * with the matching component from the `components` prop.
 *
 * @deprecated message prop — use children instead:
 * ```tsx
 * // Before (deprecated)
 * <Trans message="Click <link>here</link>" components={{ link: ... }} />
 *
 * // After (recommended)
 * <Trans>Click <a href="/next">here</a> to continue</Trans>
 * ```
 */
export const Trans: Component<TransProps> = (props) => {
  const { format } = useI18n()

  let warned = false

  return (() => {
    // No message → render children directly (recommended API)
    if (!props.message) {
      const children = props.children
      if (!children) return null

      // If children is an array with a single element, render unwrapped
      if (Array.isArray(children) && children.length === 1) {
        return children[0] as JSX.Element
      }

      // Wrap multiple children (or non-array children) in the tag element
      return (<Dynamic component={props.tag ?? 'span'}>{children}</Dynamic>) as JSX.Element
    }

    if (__DEV__ && !warned) {
      warned = true
      console.warn(
        '[fluenti] <Trans> "message" prop is deprecated. ' +
          'Use children instead for a simpler API. ' +
          'See https://fluenti.dev/guide/migration#trans-default-slot',
      )
    }

    const message = props.values
      ? format(props.message, props.values)
      : props.message

    if (!props.components) {
      return message as unknown as JSX.Element
    }

    return parseRichText(message, props.components) as unknown as JSX.Element
  }) as unknown as JSX.Element
}

/**
 * Parse a message string containing `<tag>children</tag>` markers and
 * return an array of text strings and rendered component nodes.
 */
function parseRichText(
  message: string,
  components: Record<string, Component<{ children?: JSX.Element }>>,
): (string | JSX.Element)[] {
  const result: (string | JSX.Element)[] = []
  // Match <tagName>...content...</tagName>
  const tagPattern = /<(\w+)>([\s\S]*?)<\/\1>/g
  let lastIndex = 0
  let match: RegExpExecArray | null = tagPattern.exec(message)

  while (match !== null) {
    // Push text before the tag
    if (match.index > lastIndex) {
      result.push(message.slice(lastIndex, match.index))
    }

    const tagName = match[1]!
    const innerContent = match[2]!
    const Comp = components[tagName]

    if (Comp) {
      // Recursively parse inner content for nested tags
      const children = parseRichText(innerContent, components)
      const child = children.length === 1 ? children[0] : children
      result.push(
        (() => {
          const comp = Comp as Component<{ children?: JSX.Element }>
          return comp({ children: child as JSX.Element })
        })() as JSX.Element,
      )
    } else {
      // Unknown tag — render as plain text
      result.push(`<${tagName}>${innerContent}</${tagName}>`)
    }

    lastIndex = match.index + match[0].length
    match = tagPattern.exec(message)
  }

  // Trailing text
  if (lastIndex < message.length) {
    result.push(message.slice(lastIndex))
  }

  return result
}
