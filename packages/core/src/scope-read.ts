import { isIdentifier, type ImportSpecifierNode, type StringLiteralNode } from './scope-ast-helpers'
import type { SourceNode } from './source-analysis'
import type { TemplateLiteralNode } from './scope-types'

export function readImportedName(specifier: ImportSpecifierNode): string | undefined {
  if (isIdentifier(specifier.imported)) {
    return specifier.imported.name
  }
  if (specifier.imported.type === 'StringLiteral') {
    return (specifier.imported as StringLiteralNode).value
  }
  return undefined
}

export function readPropertyKey(node: SourceNode): string | undefined {
  if (isIdentifier(node)) {
    return node.name
  }
  if (node.type === 'StringLiteral') {
    return (node as StringLiteralNode).value
  }
  return undefined
}

export function readStaticStringValue(node: SourceNode): string | undefined {
  if (node.type === 'StringLiteral') {
    return (node as StringLiteralNode).value
  }
  if (node.type === 'TemplateLiteral') {
    const literal = node as TemplateLiteralNode
    if (literal.expressions.length === 0) {
      return literal.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('')
    }
  }
  return undefined
}
