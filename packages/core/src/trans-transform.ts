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
import { parseSourceModule, walkSourceAst, type SourceNode } from './source-analysis'

export interface TransTransformResult {
  code: string
  transformed: boolean
}

// ─── AST node interfaces ─────────────────────────────────────────────────────

interface JSXElementNode extends SourceNode {
  type: 'JSXElement'
  openingElement: JSXOpeningElementNode
  closingElement: SourceNode | null
  children: SourceNode[]
}

interface JSXOpeningElementNode extends SourceNode {
  type: 'JSXOpeningElement'
  name: SourceNode
  attributes: SourceNode[]
  selfClosing: boolean
}

interface JSXIdentifierNode extends SourceNode {
  type: 'JSXIdentifier'
  name: string
}

interface JSXAttributeNode extends SourceNode {
  type: 'JSXAttribute'
  name: JSXIdentifierNode
  value?: SourceNode | null
}

interface JSXExpressionContainerNode extends SourceNode {
  type: 'JSXExpressionContainer'
  expression: SourceNode
}

interface JSXTextNode extends SourceNode {
  type: 'JSXText'
  value: string
}

interface StringLiteralNode extends SourceNode {
  type: 'StringLiteral'
  value: string
}

// ─── Replacement tracking ────────────────────────────────────────────────────

interface Replacement {
  start: number
  end: number
  text: string
}

// ─── Extracted child info ────────────────────────────────────────────────────

interface ExtractedChild {
  message: string
  componentSources: string[]
  hasDynamic: boolean
}

// ─── Main transform ─────────────────────────────────────────────────────────

/**
 * Transform all `<Trans>...</Trans>` in the given source code, injecting
 * `__id`, `__message`, and `__components` props for the runtime fast path.
 *
 * Returns the transformed code and whether any transforms were applied.
 */
export function transformTransComponents(code: string): TransTransformResult {
  const ast = parseSourceModule(code)
  if (!ast || ast.type !== 'Program') {
    return { code, transformed: false }
  }

  const replacements: Replacement[] = []

  walkSourceAst(ast, (node: SourceNode) => {
    if (node.type !== 'JSXElement') return

    const element = node as JSXElementNode
    const tagName = readJsxTagName(element.openingElement.name)
    if (tagName !== 'Trans') return

    // Self-closing <Trans /> has no children to transform
    if (element.openingElement.selfClosing) return

    const attrs = element.openingElement.attributes

    // Skip: already transformed (has __id prop)
    if (findJsxAttribute(attrs, '__id')) return

    // Skip: has message prop (legacy API)
    if (findJsxAttribute(attrs, 'message')) return

    // Extract children into ICU message + component sources
    const extracted = extractJsxChildren(element.children, code)
    if (extracted.hasDynamic) return
    if (!extracted.message) return

    // Read id and context attributes
    const customId = readStaticAttribute(attrs, 'id')
    if (customId.kind === 'dynamic') return

    const context = readStaticAttribute(attrs, 'context')
    if (!customId.value && context.kind === 'dynamic') return

    const messageId = customId.value ?? hashMessage(extracted.message, context.value)

    // Build __components array JSX
    const componentsJsx = extracted.componentSources.length > 0
      ? ` __components={[${extracted.componentSources.join(', ')}]}`
      : ''

    // Escape message for JSX string attribute
    const escapedMessage = extracted.message.replace(/"/g, '&quot;')

    // Inject pre-computed props before the ">" of the opening tag
    const injectedProps = ` __id="${messageId}" __message="${escapedMessage}"${componentsJsx}`
    const openingEnd = element.openingElement.end!
    replacements.push({
      start: openingEnd - 1, // before ">"
      end: openingEnd - 1,
      text: injectedProps,
    })
  })

  if (replacements.length === 0) {
    return { code, transformed: false }
  }

  // Apply replacements in reverse source order to preserve offsets
  replacements.sort((a, b) => b.start - a.start)
  let result = code
  for (const r of replacements) {
    result = result.slice(0, r.start) + r.text + result.slice(r.end)
  }

  return { code: result, transformed: true }
}

// ─── JSX children extraction ─────────────────────────────────────────────────

function extractJsxChildren(
  children: SourceNode[],
  code: string,
): ExtractedChild {
  const componentSources: string[] = []
  let hasDynamic = false

  function render(nodes: SourceNode[]): string {
    let message = ''

    for (const node of nodes) {
      if (node.type === 'JSXText') {
        message += (node as JSXTextNode).value
        continue
      }

      if (node.type === 'JSXExpressionContainer') {
        const expression = (node as JSXExpressionContainerNode).expression
        // JSXEmptyExpression ({/* comment */}) is harmless — skip it
        if (expression.type === 'JSXEmptyExpression') continue
        // Any other expression is dynamic — bail out
        hasDynamic = true
        return message
      }

      if (node.type === 'JSXElement') {
        const element = node as JSXElementNode
        const childTagName = readJsxTagName(element.openingElement.name)
        if (!childTagName) {
          hasDynamic = true
          return message
        }

        const idx = componentSources.length
        const attrsSource = extractAttributesSource(element.openingElement, code)
        componentSources.push(`<${childTagName}${attrsSource} />`)

        if (element.children.length > 0) {
          const inner = render(element.children)
          if (hasDynamic) return message
          message += `<${idx}>${inner}</${idx}>`
        } else {
          message += `<${idx}/>`
        }
        continue
      }

      // JSXFragment or other unexpected nodes — skip silently
    }

    return message
  }

  const message = render(children).trim()
  return { message, componentSources, hasDynamic }
}

// ─── Attribute helpers ───────────────────────────────────────────────────────

function extractAttributesSource(
  openingElement: JSXOpeningElementNode,
  code: string,
): string {
  let result = ''
  for (const attr of openingElement.attributes) {
    if (attr.start != null && attr.end != null) {
      result += ' ' + code.slice(attr.start, attr.end)
    }
  }
  return result
}

interface StaticAttributeValue {
  kind: 'missing' | 'static' | 'dynamic'
  value?: string
}

function readStaticAttribute(
  attributes: SourceNode[],
  name: string,
): StaticAttributeValue {
  const attr = findJsxAttribute(attributes, name)
  if (!attr) return { kind: 'missing' }

  // Boolean attribute (no value) — treat as missing for our purposes
  if (!attr.value) return { kind: 'missing' }

  // Static string: id="greeting"
  if (attr.value.type === 'StringLiteral') {
    return { kind: 'static', value: (attr.value as StringLiteralNode).value }
  }

  // Expression container: id={expr}
  if (attr.value.type === 'JSXExpressionContainer') {
    const expression = (attr.value as JSXExpressionContainerNode).expression
    // Static string inside expression: id={"greeting"}
    if (expression.type === 'StringLiteral') {
      return { kind: 'static', value: (expression as StringLiteralNode).value }
    }
    // Any other expression is dynamic
    return { kind: 'dynamic' }
  }

  return { kind: 'missing' }
}

function findJsxAttribute(
  attributes: SourceNode[],
  name: string,
): JSXAttributeNode | undefined {
  for (const attr of attributes) {
    if (attr.type !== 'JSXAttribute') continue
    const jsxAttr = attr as JSXAttributeNode
    if (jsxAttr.name.type === 'JSXIdentifier' && jsxAttr.name.name === name) {
      return jsxAttr
    }
  }
  return undefined
}

function readJsxTagName(node: SourceNode): string | undefined {
  if (node.type === 'JSXIdentifier') {
    return (node as JSXIdentifierNode).name
  }
  return undefined
}
