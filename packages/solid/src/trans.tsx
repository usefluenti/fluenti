import { Dynamic } from 'solid-js/web'
import { createMemo } from 'solid-js'
import type { Component, JSX } from 'solid-js'

/** A Solid component that accepts children */
export type RichComponent = Component<{ children?: JSX.Element }>

/** Props for the `<Trans>` component */
export interface TransProps {
  /** Wrapper element tag name (default: `'span'`) — used in children-only mode */
  tag?: string
  /** Children — the content to translate (legacy API) */
  children?: JSX.Element
  /** Translated message string with XML-like tags (e.g. `<bold>text</bold>`) */
  message?: string
  /** Map of tag names to Solid components */
  components?: Record<string, RichComponent>
  /** @internal Pre-computed message from build plugin */
  __message?: string
  /** @internal Pre-computed component map from build plugin */
  __components?: Record<string, RichComponent>
}

/**
 * A token from parsing the message string.
 * Either a plain text segment or a tag with inner content.
 */
interface TextToken {
  readonly type: 'text'
  readonly value: string
}

interface TagToken {
  readonly type: 'tag'
  readonly name: string
  readonly children: readonly Token[]
}

type Token = TextToken | TagToken

/**
 * Parse a message string containing XML-like tags into a token tree.
 *
 * Supports:
 * - Named tags: `<bold>content</bold>`
 * - Self-closing tags: `<br/>`
 * - Nested tags: `<bold>hello <italic>world</italic></bold>`
 */
function parseTokens(input: string): readonly Token[] {
  const tokens: Token[] = []
  let pos = 0

  while (pos < input.length) {
    const openIdx = input.indexOf('<', pos)

    if (openIdx === -1) {
      // No more tags — rest is plain text
      tokens.push({ type: 'text', value: input.slice(pos) })
      break
    }

    // Push any text before this tag
    if (openIdx > pos) {
      tokens.push({ type: 'text', value: input.slice(pos, openIdx) })
    }

    // Check for self-closing tag: <tagName/>
    const selfCloseMatch = input.slice(openIdx).match(/^<(\w+)\s*\/>/)
    if (selfCloseMatch) {
      tokens.push({ type: 'tag', name: selfCloseMatch[1]!, children: [] })
      pos = openIdx + selfCloseMatch[0].length
      continue
    }

    // Check for opening tag: <tagName>
    const openMatch = input.slice(openIdx).match(/^<(\w+)>/)
    if (!openMatch) {
      // Not a valid tag — treat '<' as text
      tokens.push({ type: 'text', value: '<' })
      pos = openIdx + 1
      continue
    }

    const tagName = openMatch[1]!
    const contentStart = openIdx + openMatch[0].length

    // Find the matching closing tag, respecting nesting
    const innerEnd = findClosingTag(input, tagName, contentStart)
    if (innerEnd === -1) {
      // No closing tag found — treat as plain text
      tokens.push({ type: 'text', value: input.slice(openIdx, contentStart) })
      pos = contentStart
      continue
    }

    const innerContent = input.slice(contentStart, innerEnd)
    const closingTag = `</${tagName}>`
    tokens.push({
      type: 'tag',
      name: tagName,
      children: parseTokens(innerContent),
    })
    pos = innerEnd + closingTag.length
  }

  return tokens
}

/**
 * Find the position of the matching closing tag, accounting for nesting
 * of the same tag name.
 *
 * Returns the index of the start of the closing tag, or -1 if not found.
 */
function findClosingTag(input: string, tagName: string, startPos: number): number {
  const openTag = `<${tagName}>`
  const closeTag = `</${tagName}>`
  let depth = 1
  let pos = startPos

  while (pos < input.length && depth > 0) {
    const nextOpen = input.indexOf(openTag, pos)
    const nextClose = input.indexOf(closeTag, pos)

    if (nextClose === -1) return -1

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      pos = nextOpen + openTag.length
    } else {
      depth--
      if (depth === 0) return nextClose
      pos = nextClose + closeTag.length
    }
  }

  return -1
}

/**
 * Render a token tree into Solid JSX elements using the components map.
 */
function renderTokens(
  tokens: readonly Token[],
  components: Record<string, RichComponent>,
): JSX.Element {
  const elements = tokens.map((token): JSX.Element => {
    if (token.type === 'text') {
      return token.value as unknown as JSX.Element
    }

    const Comp = components[token.name]
    if (!Comp) {
      // Unknown component — render inner content as plain text
      return renderTokens(token.children, components)
    }

    const innerContent = token.children.length > 0
      ? renderTokens(token.children, components)
      : undefined

    return (<Dynamic component={Comp}>{innerContent}</Dynamic>) as JSX.Element
  })

  if (elements.length === 1) return elements[0]!
  return (<>{elements}</>) as JSX.Element
}

/**
 * Render translated content with inline components.
 *
 * Supports two APIs:
 *
 * 1. **message + components** (recommended for rich text):
 * ```tsx
 * <Trans
 *   message={t`Welcome to <bold>Fluenti</bold>!`}
 *   components={{ bold: (props) => <strong>{props.children}</strong> }}
 * />
 * ```
 *
 * 2. **children** (legacy / simple passthrough):
 * ```tsx
 * <Trans>Click <a href="/next">here</a> to continue</Trans>
 * ```
 */
export const Trans: Component<TransProps> = (props) => {
  // message + components API (including build-time __message/__components)
  // Note: the vite-plugin tagged-template transform wraps Solid expressions in
  // createMemo(), so props.message may be a memo accessor (function) instead of
  // a string. We unwrap it here to handle both cases.
  const message = createMemo(() => {
    const raw = props.__message ?? props.message
    return typeof raw === 'function' ? (raw as () => string)() : raw
  })
  const components = createMemo(() => props.__components ?? props.components)

  return (() => {
    const msg = message()
    const comps = components()

    if (msg !== undefined && comps) {
      const tokens = parseTokens(msg)
      return renderTokens(tokens, comps)
    }

    // Fallback: children-only API (backward compatible)
    const children = props.children
    if (!children) return null

    // If children is an array with a single element, render unwrapped
    if (Array.isArray(children) && children.length === 1) {
      return children[0] as JSX.Element
    }

    // Wrap multiple children (or non-array children) in the tag element
    return (<Dynamic component={props.tag ?? 'span'}>{children}</Dynamic>) as JSX.Element
  }) as unknown as JSX.Element
}
