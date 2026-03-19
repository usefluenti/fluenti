import { isSourceNode, type SourceNode } from './source-analysis'

export interface IdentifierNode extends SourceNode {
  type: 'Identifier'
  name: string
}

export interface StringLiteralNode extends SourceNode {
  type: 'StringLiteral'
  value: string
}

export interface ObjectPropertyNode extends SourceNode {
  type: 'ObjectProperty'
  key: SourceNode
  value: SourceNode
  computed?: boolean
  shorthand?: boolean
}

export interface ObjectExpressionNode extends SourceNode {
  type: 'ObjectExpression'
  properties: SourceNode[]
}

export interface CallExpressionNode extends SourceNode {
  type: 'CallExpression'
  callee: SourceNode
  arguments: SourceNode[]
}

export interface MemberExpressionNode extends SourceNode {
  type: 'MemberExpression'
  object: SourceNode
  property: SourceNode
  computed: boolean
}

export interface AwaitExpressionNode extends SourceNode {
  type: 'AwaitExpression'
  argument: SourceNode
}

export interface VariableDeclaratorNode extends SourceNode {
  type: 'VariableDeclarator'
  id: SourceNode
  init?: SourceNode | null
}

export interface VariableDeclarationNode extends SourceNode {
  type: 'VariableDeclaration'
  kind: 'const' | 'let' | 'var'
  declarations: VariableDeclaratorNode[]
}

export interface ObjectPatternNode extends SourceNode {
  type: 'ObjectPattern'
  properties: SourceNode[]
}

export interface ImportSpecifierNode extends SourceNode {
  type: 'ImportSpecifier'
  imported: IdentifierNode | StringLiteralNode
  local: IdentifierNode
}

export interface ImportDeclarationNode extends SourceNode {
  type: 'ImportDeclaration'
  source: StringLiteralNode
  specifiers: SourceNode[]
}

export interface ReturnStatementNode extends SourceNode {
  type: 'ReturnStatement'
  argument: SourceNode | null
}

export interface BlockStatementNode extends SourceNode {
  type: 'BlockStatement'
  body: SourceNode[]
}

// ─── AST Builder Functions ────────────────────────────────────────────────────

export function identifier(name: string): IdentifierNode {
  return { type: 'Identifier', name }
}

export function stringLiteral(value: string): StringLiteralNode {
  return { type: 'StringLiteral', value }
}

export function objectProperty(key: SourceNode, value: SourceNode): ObjectPropertyNode {
  return {
    type: 'ObjectProperty',
    key,
    value,
    computed: false,
    shorthand: false,
  }
}

export function objectExpression(properties: SourceNode[]): ObjectExpressionNode {
  return {
    type: 'ObjectExpression',
    properties,
  }
}

export function callExpression(callee: SourceNode, args: SourceNode[], original?: SourceNode): CallExpressionNode {
  return {
    type: 'CallExpression',
    callee,
    arguments: args,
    ...(original?.start != null ? { start: original.start } : {}),
    ...(original?.end != null ? { end: original.end } : {}),
    ...(original?.loc != null ? { loc: original.loc } : {}),
  }
}

export function memberExpression(object: SourceNode, property: SourceNode): MemberExpressionNode {
  return {
    type: 'MemberExpression',
    object,
    property,
    computed: false,
  }
}

export function awaitExpression(argument: SourceNode): AwaitExpressionNode {
  return {
    type: 'AwaitExpression',
    argument,
  }
}

export function variableDeclarator(id: SourceNode, init: SourceNode): VariableDeclaratorNode {
  return {
    type: 'VariableDeclarator',
    id,
    init,
  }
}

export function variableDeclaration(kind: 'const' | 'let' | 'var', declarations: VariableDeclaratorNode[]): VariableDeclarationNode {
  return {
    type: 'VariableDeclaration',
    kind,
    declarations,
  }
}

export function objectPattern(properties: SourceNode[]): ObjectPatternNode {
  return {
    type: 'ObjectPattern',
    properties,
  }
}

export function importSpecifier(importedName: string, localName: string): ImportSpecifierNode {
  return {
    type: 'ImportSpecifier',
    imported: identifier(importedName),
    local: identifier(localName),
  }
}

export function importDeclaration(source: string, specifiers: SourceNode[]): ImportDeclarationNode {
  return {
    type: 'ImportDeclaration',
    source: stringLiteral(source),
    specifiers,
  }
}

export function returnStatement(argument: SourceNode): ReturnStatementNode {
  return {
    type: 'ReturnStatement',
    argument,
  }
}

export function blockStatement(body: SourceNode[]): BlockStatementNode {
  return {
    type: 'BlockStatement',
    body,
  }
}

// ─── Type Guards ──────────────────────────────────────────────────────────────

export function isImportDeclaration(node: unknown): node is ImportDeclarationNode {
  return isSourceNode(node) && node.type === 'ImportDeclaration'
}

export function isImportSpecifier(node: unknown): node is ImportSpecifierNode {
  return isSourceNode(node) && node.type === 'ImportSpecifier'
}

export function isVariableDeclarator(node: unknown): node is VariableDeclaratorNode {
  return isSourceNode(node) && node.type === 'VariableDeclarator'
}

export function isCallExpression(node: unknown): node is CallExpressionNode {
  return isSourceNode(node) && node.type === 'CallExpression'
}

export function isIdentifier(node: unknown): node is IdentifierNode {
  return isSourceNode(node) && node.type === 'Identifier'
}
