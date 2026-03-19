import type { ExtractedMessage } from '@fluenti/core'
import {
  createMessageId,
  isSourceNode,
  parseSourceModule,
  walkSourceAst,
  type SourceNode,
} from '@fluenti/core/internal'

interface IdentifierNode extends SourceNode {
  type: 'Identifier'
  name: string
}

interface StringLiteralNode extends SourceNode {
  type: 'StringLiteral'
  value: string
}

interface NumericLiteralNode extends SourceNode {
  type: 'NumericLiteral'
  value: number
}

interface TemplateElementNode extends SourceNode {
  type: 'TemplateElement'
  value: { raw: string; cooked: string | null }
}

interface TemplateLiteralNode extends SourceNode {
  type: 'TemplateLiteral'
  quasis: TemplateElementNode[]
  expressions: SourceNode[]
}

interface TaggedTemplateExpressionNode extends SourceNode {
  type: 'TaggedTemplateExpression'
  tag: SourceNode
  quasi: TemplateLiteralNode
}

interface CallExpressionNode extends SourceNode {
  type: 'CallExpression'
  callee: SourceNode
  arguments: SourceNode[]
}

interface ImportDeclarationNode extends SourceNode {
  type: 'ImportDeclaration'
  source: StringLiteralNode
  specifiers: SourceNode[]
}

interface ImportSpecifierNode extends SourceNode {
  type: 'ImportSpecifier'
  imported: IdentifierNode | StringLiteralNode
  local: IdentifierNode
}

interface ObjectExpressionNode extends SourceNode {
  type: 'ObjectExpression'
  properties: SourceNode[]
}

interface ObjectPropertyNode extends SourceNode {
  type: 'ObjectProperty'
  key: SourceNode
  value: SourceNode
  computed?: boolean
}

interface JSXElementNode extends SourceNode {
  type: 'JSXElement'
  openingElement: JSXOpeningElementNode
  children: SourceNode[]
}

interface JSXFragmentNode extends SourceNode {
  type: 'JSXFragment'
  children: SourceNode[]
}

interface JSXOpeningElementNode extends SourceNode {
  type: 'JSXOpeningElement'
  name: SourceNode
  attributes: SourceNode[]
}

interface JSXAttributeNode extends SourceNode {
  type: 'JSXAttribute'
  name: SourceNode
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

interface ExtractedDescriptor {
  id: string
  message?: string
  context?: string
  comment?: string
}

const DIRECT_T_SOURCES = new Set([
  '@fluenti/react',
  '@fluenti/vue',
  '@fluenti/solid',
  '@fluenti/next/__generated',
])

function classifyExpression(expr: string): string {
  const trimmed = expr.trim()
  // Simple identifier: name, count
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
    return trimmed
  }
  // Dotted path: user.name → name
  if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(trimmed) && !trimmed.endsWith('.')) {
    const parts = trimmed.split('.')
    return parts[parts.length - 1]!
  }
  // Function call: fun() → fun, obj.method() → obj_method
  const callMatch = trimmed.match(/^([a-zA-Z_$][a-zA-Z0-9_$.]*)\s*\(/)
  if (callMatch) {
    return callMatch[1]!.replace(/\./g, '_')
  }
  return ''
}

function buildICUFromTemplate(
  strings: readonly string[],
  expressions: readonly string[],
): string {
  let result = ''
  let positionalIndex = 0

  for (let index = 0; index < strings.length; index++) {
    result += strings[index]!
    if (index >= expressions.length) continue

    const name = classifyExpression(expressions[index]!)
    if (name === '') {
      result += `{arg${positionalIndex}}`
      positionalIndex++
      continue
    }

    result += `{${name}}`
  }

  return result
}

function createExtractedMessage(
  descriptor: ExtractedDescriptor,
  filename: string,
  node: SourceNode,
): ExtractedMessage | undefined {
  if (!descriptor.message) {
    return undefined
  }

  const line = node.loc?.start.line ?? 1
  const column = (node.loc?.start.column ?? 0) + 1

  return {
    id: descriptor.id,
    message: descriptor.message,
    ...(descriptor.context !== undefined ? { context: descriptor.context } : {}),
    ...(descriptor.comment !== undefined ? { comment: descriptor.comment } : {}),
    origin: { file: filename, line, column },
  }
}

function descriptorFromStaticParts(parts: {
  id?: string
  message?: string
  context?: string
  comment?: string
}): ExtractedDescriptor | undefined {
  if (!parts.message) {
    return undefined
  }

  return {
    id: parts.id ?? createMessageId(parts.message, parts.context),
    message: parts.message,
    ...(parts.context !== undefined ? { context: parts.context } : {}),
    ...(parts.comment !== undefined ? { comment: parts.comment } : {}),
  }
}

function extractDescriptorFromCallArgument(argument: SourceNode): ExtractedDescriptor | undefined {
  if (argument.type === 'StringLiteral') {
    return descriptorFromStaticParts({ message: (argument as StringLiteralNode).value })
  }

  if (argument.type === 'TemplateLiteral') {
    const template = argument as TemplateLiteralNode
    if (template.expressions.length === 0) {
      const message = template.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('')
      return descriptorFromStaticParts({ message })
    }
    return undefined
  }

  if (argument.type !== 'ObjectExpression') {
    return undefined
  }

  const staticParts: { id?: string; message?: string; context?: string; comment?: string } = {}
  for (const property of (argument as ObjectExpressionNode).properties) {
    if (property.type !== 'ObjectProperty') continue

    const objectProperty = property as ObjectPropertyNode
    if (objectProperty.computed || !isIdentifier(objectProperty.key)) continue

    const key = objectProperty.key.name
    if (!['id', 'message', 'context', 'comment'].includes(key)) continue

    const value = readStaticStringValue(objectProperty.value)
    if (value === undefined) continue
    staticParts[key as keyof typeof staticParts] = value
  }

  if (!staticParts.message) {
    return undefined
  }

  return descriptorFromStaticParts(staticParts)
}

function buildPluralICU(props: Record<string, string>): string {
  const categories = ['zero', 'one', 'two', 'few', 'many', 'other'] as const
  const countVar = props['value'] ?? props['count'] ?? 'count'
  const options: string[] = []
  const offset = props['offset']

  for (const category of categories) {
    const value = props[category]
    if (value === undefined) continue
    const key = category === 'zero' ? '=0' : category
    options.push(`${key} {${value}}`)
  }

  if (options.length === 0) {
    return ''
  }

  const offsetPrefix = offset ? `offset:${offset} ` : ''
  return `{${countVar}, plural, ${offsetPrefix}${options.join(' ')}}`
}

function extractRichTextMessage(children: readonly SourceNode[]): string | undefined {
  let nextIndex = 0

  function render(nodes: readonly SourceNode[]): string | undefined {
    let message = ''

    for (const node of nodes) {
      if (node.type === 'JSXText') {
        message += normalizeJsxText((node as JSXTextNode).value)
        continue
      }

      if (node.type === 'JSXElement') {
        const idx = nextIndex++
        const inner = render((node as JSXElementNode).children)
        if (inner === undefined) return undefined
        message += `<${idx}>${inner}</${idx}>`
        continue
      }

      if (node.type === 'JSXFragment') {
        const inner = render((node as JSXFragmentNode).children)
        if (inner === undefined) return undefined
        message += inner
        continue
      }

      if (node.type === 'JSXExpressionContainer') {
        const expression = (node as JSXExpressionContainerNode).expression
        if (expression.type === 'StringLiteral') {
          message += (expression as StringLiteralNode).value
          continue
        }
        if (expression.type === 'NumericLiteral') {
          message += String((expression as NumericLiteralNode).value)
          continue
        }
        return undefined
      }
    }

    return message
  }

  const message = render(children)
  if (message === undefined) return undefined

  const normalized = message.replace(/\s+/g, ' ').trim()
  return normalized || undefined
}

function normalizeJsxText(value: string): string {
  return value.replace(/\s+/g, ' ')
}

function readStaticStringValue(node: SourceNode): string | undefined {
  if (node.type === 'StringLiteral') {
    return (node as StringLiteralNode).value
  }

  if (node.type === 'NumericLiteral') {
    return String((node as NumericLiteralNode).value)
  }

  if (node.type === 'JSXExpressionContainer') {
    return readStaticStringValue((node as JSXExpressionContainerNode).expression)
  }

  if (node.type === 'TemplateLiteral') {
    const template = node as TemplateLiteralNode
    if (template.expressions.length === 0) {
      return template.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('')
    }
  }

  return undefined
}

function readExpressionSource(node: SourceNode, code: string): string | undefined {
  if (node.start == null || node.end == null) {
    return undefined
  }

  if (node.type === 'JSXExpressionContainer') {
    return readExpressionSource((node as JSXExpressionContainerNode).expression, code)
  }

  return code.slice(node.start, node.end).trim()
}

function getJsxAttribute(
  openingElement: JSXOpeningElementNode,
  name: string,
): JSXAttributeNode | undefined {
  for (const attribute of openingElement.attributes) {
    if (attribute.type !== 'JSXAttribute') continue

    const jsxAttribute = attribute as JSXAttributeNode
    if (jsxAttribute.name.type === 'JSXIdentifier' && jsxAttribute.name['name'] === name) {
      return jsxAttribute
    }
  }

  return undefined
}

function extractPluralProps(
  openingElement: JSXOpeningElementNode,
  code: string,
): Record<string, string> {
  const props: Record<string, string> = {}
  const propNames = ['id', 'value', 'count', 'offset', 'zero', 'one', 'two', 'few', 'many', 'other']

  for (const name of propNames) {
    const attribute = getJsxAttribute(openingElement, name)
    if (!attribute?.value) continue

    const staticValue = readStaticStringValue(attribute.value)
    if (staticValue !== undefined) {
      props[name] = staticValue
      continue
    }

    const exprValue = readExpressionSource(attribute.value, code)
    if (exprValue !== undefined && (name === 'value' || name === 'count' || name === 'offset')) {
      props[name] = exprValue
    }
  }

  return props
}

function extractTaggedTemplateMessage(
  code: string,
  node: TaggedTemplateExpressionNode,
): ExtractedDescriptor {
  const strings = node.quasi.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw)
  const expressions = node.quasi.expressions.map((expression) => {
    if (expression.start == null || expression.end == null) {
      return ''
    }
    return code.slice(expression.start, expression.end)
  })
  const message = buildICUFromTemplate(strings, expressions)

  return {
    id: createMessageId(message),
    message,
  }
}

function collectDirectImportTBindings(ast: SourceNode): Set<string> {
  const bindings = new Set<string>()
  const body = Array.isArray(ast['body']) ? ast['body'] : []

  for (const entry of body) {
    if (!isImportDeclaration(entry)) continue
    if (!DIRECT_T_SOURCES.has(entry.source.value)) continue

    for (const specifier of entry.specifiers) {
      if (!isImportSpecifier(specifier)) continue
      if (readImportedName(specifier) !== 't') continue
      bindings.add(specifier.local.name)
    }
  }

  return bindings
}

export function extractFromTsx(code: string, filename: string): ExtractedMessage[] {
  const ast = parseSourceModule(code)
  if (!ast) {
    return []
  }

  const messages: ExtractedMessage[] = []
  const directImportTBindings = collectDirectImportTBindings(ast)

  walkSourceAst(ast, (node: SourceNode) => {
    if (node.type === 'TaggedTemplateExpression') {
      const tagged = node as TaggedTemplateExpressionNode
      if (
        isIdentifier(tagged.tag)
        && (tagged.tag.name === 't' || directImportTBindings.has(tagged.tag.name))
      ) {
        // Skip tagged templates with interpolation — they are handled
        // by the vite plugin scope transform at build time, not via PO.
        if (tagged.quasi.expressions.length > 0) {
          return
        }
        const extracted = createExtractedMessage(
          extractTaggedTemplateMessage(code, tagged),
          filename,
          tagged,
        )
        if (extracted) {
          messages.push(extracted)
        }
      }
      return
    }

    if (node.type === 'CallExpression') {
      const call = node as CallExpressionNode
      if (isIdentifier(call.callee) && (call.callee.name === 't' || directImportTBindings.has(call.callee.name))) {
        if (directImportTBindings.has(call.callee.name) && call.arguments[0]?.type !== 'ObjectExpression') {
          return
        }
        const descriptor = call.arguments[0] ? extractDescriptorFromCallArgument(call.arguments[0]) : undefined
        const extracted = descriptor
          ? createExtractedMessage(descriptor, filename, call)
          : undefined
        if (extracted) {
          messages.push(extracted)
        }
      }
      return
    }

    if (node.type !== 'JSXElement') {
      return
    }

    const element = node as JSXElementNode
    const openingElement = element.openingElement
    const elementName = readJsxElementName(openingElement.name)

    if (elementName === 'Trans') {
      const messageAttr = getJsxAttribute(openingElement, 'message')
      const idAttr = getJsxAttribute(openingElement, 'id')
      const contextAttr = getJsxAttribute(openingElement, 'context')
      const commentAttr = getJsxAttribute(openingElement, 'comment')

      const descriptor = messageAttr?.value
        ? buildStaticTransDescriptor({
            id: idAttr?.value ? readStaticStringValue(idAttr.value) : undefined,
            message: readStaticStringValue(messageAttr.value),
            context: contextAttr?.value ? readStaticStringValue(contextAttr.value) : undefined,
            comment: commentAttr?.value ? readStaticStringValue(commentAttr.value) : undefined,
          })
        : buildStaticTransDescriptor({
            id: idAttr?.value ? readStaticStringValue(idAttr.value) : undefined,
            message: extractRichTextMessage(element.children),
            context: contextAttr?.value ? readStaticStringValue(contextAttr.value) : undefined,
            comment: commentAttr?.value ? readStaticStringValue(commentAttr.value) : undefined,
          })

      const extracted = descriptor
        ? createExtractedMessage(descriptor, filename, element)
        : undefined
      if (extracted) {
        messages.push(extracted)
      }
      return
    }

    if (elementName === 'Plural') {
      const props = extractPluralProps(openingElement, code)
      const message = buildPluralICU(props)
      if (!message) {
        return
      }

      const extracted = createExtractedMessage(
        {
          id: props['id'] ?? createMessageId(message),
          message,
        },
        filename,
        element,
      )
      if (extracted) {
        messages.push(extracted)
      }
    }
  })

  return messages
}

function isImportDeclaration(node: unknown): node is ImportDeclarationNode {
  return isSourceNode(node) && node.type === 'ImportDeclaration'
}

function isImportSpecifier(node: unknown): node is ImportSpecifierNode {
  return isSourceNode(node) && node.type === 'ImportSpecifier'
}

function readImportedName(specifier: ImportSpecifierNode): string | undefined {
  if (specifier.imported.type === 'Identifier') {
    return (specifier.imported as IdentifierNode).name
  }
  if (specifier.imported.type === 'StringLiteral') {
    return (specifier.imported as StringLiteralNode).value
  }
  return undefined
}

function readJsxElementName(node: SourceNode): string | undefined {
  if (node.type === 'JSXIdentifier') {
    return String(node['name'])
  }
  return undefined
}

function buildStaticTransDescriptor(parts: {
  id: string | undefined
  message: string | undefined
  context: string | undefined
  comment: string | undefined
}): ExtractedDescriptor | undefined {
  const payload: {
    id?: string
    message?: string
    context?: string
    comment?: string
  } = {}

  if (parts.id !== undefined) payload.id = parts.id
  if (parts.message !== undefined) payload.message = parts.message
  if (parts.context !== undefined) payload.context = parts.context
  if (parts.comment !== undefined) payload.comment = parts.comment

  return descriptorFromStaticParts(payload)
}

function isIdentifier(node: unknown): node is IdentifierNode {
  return isSourceNode(node) && node.type === 'Identifier'
}
