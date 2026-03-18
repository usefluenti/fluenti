/**
 * Compile-time transform for `<Trans>` components in JSX/TSX files.
 *
 * Extracts children into pre-computed `__id`, `__message`, and `__components`
 * props so the runtime Trans component can skip `extractMessage()` and
 * `hashMessage()`.
 *
 * Falls back gracefully: if no transform is applied (dynamic children, already
 * transformed, etc.) the runtime path handles it as before.
 */

import { hashMessage } from './msg'

export interface TransTransformResult {
  code: string
  transformed: boolean
}

/**
 * Regex to match `<Trans>...</Trans>` blocks.
 *
 * Captures:
 *   [1] = opening tag attributes (may be empty)
 *   [2] = children content
 *
 * Skips self-closing `<Trans />`.
 */
const TRANS_RE = /<Trans(\s[^>]*)?>(?!\s*$)([\s\S]*?)<\/Trans>/g

/**
 * Regex to match a single JSX element inside Trans children.
 * Handles both paired and self-closing tags.
 *
 * Paired:       <tagName ...props>inner</tagName>
 * Self-closing: <tagName ...props />
 */
const CHILD_ELEMENT_PAIRED_RE = /<(\w+)((?:\s(?:[^>]|(?:"[^"]*")|(?:'[^']*'))*?)?)>([\s\S]*?)<\/\1>/
const CHILD_ELEMENT_SELF_RE = /<(\w+)((?:\s(?:[^>]|(?:"[^"]*")|(?:'[^']*'))*?)?)\s*\/>/

/**
 * Check if children contain dynamic JSX expressions like {variable}.
 * We skip transform for these since they can't be statically analyzed.
 */
function hasDynamicExpression(children: string): boolean {
  // Match { ... } that isn't inside a JSX tag (< ... >)
  // Simple heuristic: any { not preceded by < on the same "level"
  let depth = 0
  for (let i = 0; i < children.length; i++) {
    const ch = children[i]
    if (ch === '<') depth++
    else if (ch === '>') depth--
    else if (ch === '{' && depth === 0) return true
  }
  return false
}

interface ExtractedChild {
  /** The ICU-style message: "Hello <0>world</0>" */
  message: string
  /** JSX source for each component: ["<b />", "<a href=\"/docs\" />"] */
  componentSources: string[]
}

/**
 * Extract children text into an ICU message and component array.
 *
 * Converts:
 *   Hello <b>world</b> and <a href="/docs">docs</a>
 * Into:
 *   message: "Hello <0>world</0> and <1>docs</1>"
 *   componentSources: ["<b />", "<a href=\"/docs\" />"]
 */
function extractChildren(children: string): ExtractedChild {
  let message = ''
  const componentSources: string[] = []
  let remaining = children

  while (remaining.length > 0) {
    // Try to match a paired element
    const pairedMatch = CHILD_ELEMENT_PAIRED_RE.exec(remaining)
    // Try to match a self-closing element
    const selfMatch = CHILD_ELEMENT_SELF_RE.exec(remaining)

    // Pick the earliest match
    let match: RegExpExecArray | null = null
    let isSelfClosing = false

    if (pairedMatch && selfMatch) {
      if (selfMatch.index < pairedMatch.index) {
        match = selfMatch
        isSelfClosing = true
      } else {
        match = pairedMatch
      }
    } else if (pairedMatch) {
      match = pairedMatch
    } else if (selfMatch) {
      match = selfMatch
      isSelfClosing = true
    }

    if (!match) {
      // No more elements — rest is plain text
      message += remaining
      break
    }

    // Add text before the element
    message += remaining.slice(0, match.index)

    const idx = componentSources.length
    const tagName = match[1]!
    const attrs = (match[2] ?? '').trimEnd()

    if (isSelfClosing) {
      // Self-closing: <Tag attrs />  →  <idx/>  in message
      componentSources.push(`<${tagName}${attrs} />`)
      message += `<${idx}/>`
    } else {
      // Paired: <Tag attrs>inner</Tag>
      const innerContent = match[3]!
      // Recursively extract inner children
      const inner = extractChildren(innerContent)
      // Merge inner components (offset their indices)
      const offsetMessage = offsetIndices(inner.message, idx + 1)
      componentSources.push(`<${tagName}${attrs} />`)
      componentSources.push(...inner.componentSources)
      message += `<${idx}>${offsetMessage}</${idx}>`
    }

    remaining = remaining.slice(match.index + match[0].length)
  }

  return { message: message.trim(), componentSources }
}

/**
 * Offset numeric indices in a message string by a given amount.
 * E.g. "<0>text</0>" with offset 1 → "<1>text</1>"
 */
function offsetIndices(message: string, offset: number): string {
  if (offset === 0) return message
  return message.replace(/<(\d+)(\/?>)/g, (_m, idx, rest) => {
    return `<${Number(idx) + offset}${rest}`
  }).replace(/<\/(\d+)>/g, (_m, idx) => {
    return `</${Number(idx) + offset}>`
  })
}

/**
 * Transform all `<Trans>...</Trans>` in the given source code, injecting
 * `__id`, `__message`, and `__components` props for the runtime fast path.
 *
 * Returns the transformed code and whether any transforms were applied.
 */
export function transformTransComponents(code: string): TransTransformResult {
  let transformed = false
  TRANS_RE.lastIndex = 0

  const result = code.replace(TRANS_RE, (fullMatch, attrs: string | undefined, children: string) => {
    const attrStr = attrs ?? ''

    // Skip: already transformed (has __id prop)
    if (attrStr.includes('__id')) return fullMatch

    // Skip: has message prop (legacy API)
    if (/\bmessage\s*=/.test(attrStr)) return fullMatch

    // Skip: dynamic expressions in children
    if (hasDynamicExpression(children)) return fullMatch

    // Extract message and components
    const extracted = extractChildren(children)
    if (!extracted.message) return fullMatch

    const customId = readStaticJsxAttribute(attrStr, 'id')
    if (customId.kind === 'dynamic') return fullMatch

    const context = readStaticJsxAttribute(attrStr, 'context')
    if (!customId.value && context.kind === 'dynamic') return fullMatch

    const messageId = customId.value ?? hashMessage(extracted.message, context.value)

    // Build __components array JSX
    const componentsJsx = extracted.componentSources.length > 0
      ? ` __components={[${extracted.componentSources.join(', ')}]}`
      : ''

    // Escape message for JSX string attribute
    const escapedMessage = extracted.message.replace(/"/g, '&quot;')

    // Inject pre-computed props into the opening <Trans tag
    const injectedProps = ` __id="${messageId}" __message="${escapedMessage}"${componentsJsx}`

    transformed = true
    return `<Trans${attrStr}${injectedProps}>${children}</Trans>`
  })

  return { code: result, transformed }
}

interface StaticAttributeValue {
  kind: 'missing' | 'static' | 'dynamic'
  value?: string
}

function readStaticJsxAttribute(
  attrs: string,
  name: string,
): StaticAttributeValue {
  const dynamicPattern = new RegExp(`\\b${name}\\s*=\\s*\\{`)
  if (dynamicPattern.test(attrs)) {
    return { kind: 'dynamic' }
  }

  const staticPattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`)
  const match = attrs.match(staticPattern)
  if (!match) {
    return { kind: 'missing' }
  }

  return {
    kind: 'static',
    value: match[1] ?? match[2] ?? '',
  }
}
