/**
 * Build-mode transform for code-splitting.
 *
 * Strategy 'dynamic': rewrites supported translation calls to __catalog._<hash> references.
 * Strategy 'static': rewrites to direct named imports from compiled locale modules.
 */

import { hashMessage as defaultHashMessage } from '@fluenti/core'
import { parseSourceModule, walkSourceAst, type SourceNode } from '@fluenti/core/internal'

export type HashFunction = (message: string, context?: string) => string

export interface BuildTransformResult {
  code: string
  needsCatalogImport: boolean
  usedHashes: Set<string>
}

export interface BuildTransformOptions {
  /** Custom hash function for message IDs (defaults to @fluenti/core hashMessage) */
  hashFn?: HashFunction
}

type SplitStrategy = 'dynamic' | 'static'

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
  value: { cooked: string | null; raw: string }
}

interface TemplateLiteralNode extends SourceNode {
  type: 'TemplateLiteral'
  expressions: SourceNode[]
  quasis: TemplateElementNode[]
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

interface CallExpressionNode extends SourceNode {
  type: 'CallExpression'
  callee: SourceNode
  arguments: SourceNode[]
}

interface AwaitExpressionNode extends SourceNode {
  type: 'AwaitExpression'
  argument: SourceNode
}

interface VariableDeclaratorNode extends SourceNode {
  type: 'VariableDeclarator'
  id: SourceNode
  init?: SourceNode | null
}

interface ProgramNode extends SourceNode {
  type: 'Program'
  body: SourceNode[]
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

interface ObjectPatternNode extends SourceNode {
  type: 'ObjectPattern'
  properties: SourceNode[]
}

interface MemberExpressionNode extends SourceNode {
  type: 'MemberExpression'
  object: SourceNode
  property: SourceNode
  computed?: boolean
}

interface JSXElementNode extends SourceNode {
  type: 'JSXElement'
  openingElement: JSXOpeningElementNode
}

interface JSXOpeningElementNode extends SourceNode {
  type: 'JSXOpeningElement'
  name: SourceNode
  attributes: SourceNode[]
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

interface SplitReplacement {
  start: number
  end: number
  replacement: string
}

interface SplitTarget {
  catalogId: string
  valuesSource?: string
}

interface RuntimeBindings {
  tracked: Set<string>
  unref: Set<string>
}

export function transformForDynamicSplit(code: string, options?: BuildTransformOptions): BuildTransformResult {
  return transformForSplitStrategy(code, 'dynamic', options)
}

export function transformForStaticSplit(code: string, options?: BuildTransformOptions): BuildTransformResult {
  return transformForSplitStrategy(code, 'static', options)
}

function transformForSplitStrategy(
  code: string,
  strategy: SplitStrategy,
  options?: BuildTransformOptions,
): BuildTransformResult {
  const hashFn = options?.hashFn ?? defaultHashMessage
  const ast = parseSourceModule(code)
  if (!ast || ast.type !== 'Program') {
    return { code, needsCatalogImport: false, usedHashes: new Set() }
  }

  const bindings = collectTrackedRuntimeBindings(ast as ProgramNode)
  const replacements: SplitReplacement[] = []
  const usedHashes = new Set<string>()

  walkSourceAst(ast, (node) => {
    const replacement = extractCallReplacement(code, node, bindings, strategy, usedHashes, hashFn)
    if (replacement) {
      replacements.push(replacement)
      return
    }

    collectComponentUsage(node, usedHashes, hashFn)
  })

  if (replacements.length === 0) {
    return { code, needsCatalogImport: false, usedHashes }
  }

  let result = code
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = replacements[i]!
    result = result.slice(0, start) + replacement + result.slice(end)
  }

  return { code: result, needsCatalogImport: true, usedHashes }
}

function collectTrackedRuntimeBindings(program: ProgramNode): RuntimeBindings {
  const tracked = new Set<string>()
  const useI18nBindings = new Set<string>()
  const getI18nBindings = new Set<string>()
  const unrefBindings = new Set<string>()

  for (const statement of program.body) {
    if (!isImportDeclaration(statement)) continue
    for (const specifier of statement.specifiers) {
      if (!isImportSpecifier(specifier)) continue
      const importedName = readImportedName(specifier)
      if (!importedName) continue
      if (importedName === 'useI18n') {
        useI18nBindings.add(specifier.local.name)
      }
      if (importedName === 'getI18n') {
        getI18nBindings.add(specifier.local.name)
      }
      if (importedName === 'unref') {
        unrefBindings.add(specifier.local.name)
      }
    }
  }

  walkSourceAst(program, (node) => {
    if (!isVariableDeclarator(node) || !node.init || !isObjectPattern(node.id)) return

    if (isCallExpression(node.init) && isIdentifier(node.init.callee) && useI18nBindings.has(node.init.callee.name)) {
      addTrackedObjectPatternBindings(node.id, tracked)
      return
    }

    const awaitedCall = node.init.type === 'AwaitExpression'
      ? (node.init as AwaitExpressionNode).argument
      : null

    if (
      awaitedCall
      && isCallExpression(awaitedCall)
      && isIdentifier(awaitedCall.callee)
      && getI18nBindings.has(awaitedCall.callee.name)
    ) {
      addTrackedObjectPatternBindings(node.id, tracked)
    }
  })

  return { tracked, unref: unrefBindings }
}

function addTrackedObjectPatternBindings(pattern: ObjectPatternNode, tracked: Set<string>): void {
  for (const property of pattern.properties) {
    if (!isObjectProperty(property) || property.computed) continue
    if (!isIdentifier(property.key) || property.key.name !== 't') continue
    if (isIdentifier(property.value)) {
      tracked.add(property.value.name)
    }
  }
}

function extractCallReplacement(
  code: string,
  node: SourceNode,
  bindings: RuntimeBindings,
  strategy: SplitStrategy,
  usedHashes: Set<string>,
  hashFn: HashFunction,
): SplitReplacement | undefined {
  if (!isCallExpression(node) || node.start == null || node.end == null) {
    return undefined
  }

  const splitTarget = resolveSplitTarget(code, node, bindings, hashFn)
  if (!splitTarget) {
    return undefined
  }

  const { catalogId } = splitTarget
  usedHashes.add(catalogId)
  const exportHash = hashFn(catalogId)
  const replacementTarget = strategy === 'dynamic'
    ? `__catalog[${JSON.stringify(catalogId)}]`
    : `_${exportHash}`
  const replacement = splitTarget.valuesSource
    ? `${replacementTarget}(${splitTarget.valuesSource})`
    : replacementTarget

  return {
    start: node.start,
    end: node.end,
    replacement,
  }
}

function resolveSplitTarget(
  code: string,
  call: CallExpressionNode,
  bindings: RuntimeBindings,
  hashFn: HashFunction,
): SplitTarget | undefined {
  if (call.arguments.length === 0) return undefined

  const callee = call.callee
  const isTrackedIdentifierCall = isIdentifier(callee) && (bindings.tracked.has(callee.name) || callee.name === '$t')
  const isTemplateMemberCall = isMemberExpression(callee)
    && !callee.computed
    && isIdentifier(callee.property)
    && (
      callee.property.name === '$t'
      || (
        callee.property.name === 't'
        && isIdentifier(callee.object)
        && (callee.object.name === '_ctx' || callee.object.name === '$setup')
      )
    )
  const isVueUnrefCall = isCallExpression(callee)
    && isIdentifier(callee.callee)
    && bindings.unref.has(callee.callee.name)
    && callee.arguments.length === 1
    && isIdentifier(callee.arguments[0])
    && bindings.tracked.has(callee.arguments[0].name)

  if (!isTrackedIdentifierCall && !isTemplateMemberCall && !isVueUnrefCall) {
    return undefined
  }

  const catalogId = extractCatalogId(call.arguments[0]!, hashFn)
  if (!catalogId) return undefined

  const valuesSource = call.arguments[1] && call.arguments[1]!.start != null && call.arguments[1]!.end != null
    ? code.slice(call.arguments[1]!.start, call.arguments[1]!.end)
    : undefined

  return valuesSource === undefined
    ? { catalogId }
    : { catalogId, valuesSource }
}

function extractCatalogId(argument: SourceNode, hashFn: HashFunction): string | undefined {
  const staticString = readStaticString(argument)
  if (staticString !== undefined) {
    return hashFn(staticString)
  }

  if (!isObjectExpression(argument)) {
    return undefined
  }

  let id: string | undefined
  let message: string | undefined
  let context: string | undefined

  for (const property of argument.properties) {
    if (!isObjectProperty(property) || property.computed) continue
    const key = readPropertyKey(property.key)
    if (!key) continue

    const value = readStaticString(property.value)
    if (value === undefined) continue

    if (key === 'id') id = value
    if (key === 'message') message = value
    if (key === 'context') context = value
  }

  if (id) return id
  if (message) return hashFn(message, context)
  return undefined
}

function collectComponentUsage(node: SourceNode, usedHashes: Set<string>, hashFn: HashFunction): void {
  if (!isJsxElement(node)) return

  const componentName = readJsxName(node.openingElement.name)
  if (!componentName) return

  if (componentName === 'Trans') {
    const id = readJsxStaticAttribute(node.openingElement, '__id') ?? readJsxStaticAttribute(node.openingElement, 'id')
    if (id) {
      usedHashes.add(id)
      return
    }

    const message = readJsxStaticAttribute(node.openingElement, '__message')
    const context = readJsxStaticAttribute(node.openingElement, 'context')
    if (message) {
      usedHashes.add(hashFn(message, context))
    }
    return
  }

  if (componentName === 'Plural') {
    const messageId = buildPluralMessageId(node.openingElement, hashFn)
    if (messageId) {
      usedHashes.add(messageId)
    }
    return
  }

  if (componentName === 'Select') {
    const messageId = buildSelectMessageId(node.openingElement, hashFn)
    if (messageId) {
      usedHashes.add(messageId)
    }
  }
}

function buildPluralMessageId(openingElement: JSXOpeningElementNode, hashFn: HashFunction): string | undefined {
  const id = readJsxStaticAttribute(openingElement, 'id')
  if (id) return id

  const context = readJsxStaticAttribute(openingElement, 'context')
  const offsetRaw = readJsxStaticNumber(openingElement, 'offset')
  const forms = [
    readJsxStaticAttribute(openingElement, 'zero') === undefined ? undefined : `=0 {${readJsxStaticAttribute(openingElement, 'zero')}}`,
    readJsxStaticAttribute(openingElement, 'one') === undefined ? undefined : `one {${readJsxStaticAttribute(openingElement, 'one')}}`,
    readJsxStaticAttribute(openingElement, 'two') === undefined ? undefined : `two {${readJsxStaticAttribute(openingElement, 'two')}}`,
    readJsxStaticAttribute(openingElement, 'few') === undefined ? undefined : `few {${readJsxStaticAttribute(openingElement, 'few')}}`,
    readJsxStaticAttribute(openingElement, 'many') === undefined ? undefined : `many {${readJsxStaticAttribute(openingElement, 'many')}}`,
    readJsxStaticAttribute(openingElement, 'other') === undefined ? undefined : `other {${readJsxStaticAttribute(openingElement, 'other')}}`,
  ].filter(Boolean)

  if (forms.length === 0) return undefined

  const offsetPart = typeof offsetRaw === 'number' ? ` offset:${offsetRaw}` : ''
  const icuMessage = `{count, plural,${offsetPart} ${forms.join(' ')}}`
  return hashFn(icuMessage, context)
}

function buildSelectMessageId(openingElement: JSXOpeningElementNode, hashFn: HashFunction): string | undefined {
  const id = readJsxStaticAttribute(openingElement, 'id')
  if (id) return id

  const context = readJsxStaticAttribute(openingElement, 'context')
  const forms = readStaticSelectForms(openingElement)
  if (!forms || forms['other'] === undefined) return undefined

  const orderedKeys = [...Object.keys(forms).filter((key) => key !== 'other').sort(), 'other']
  const icuMessage = `{value, select, ${orderedKeys.map((key) => `${key} {${forms[key]!}}`).join(' ')}}`
  return hashFn(icuMessage, context)
}

function readStaticSelectForms(openingElement: JSXOpeningElementNode): Record<string, string> | undefined {
  const optionForms = readJsxStaticObject(openingElement, 'options')
  if (optionForms) {
    const other = readJsxStaticAttribute(openingElement, 'other')
    return {
      ...optionForms,
      ...(other !== undefined ? { other } : {}),
    }
  }

  const forms: Record<string, string> = {}
  for (const attribute of openingElement.attributes) {
    if (!isJsxAttribute(attribute)) continue
    const name = attribute.name.name
    if (['value', 'id', 'context', 'comment', 'options'].includes(name)) continue
    const value = readJsxAttributeValue(attribute)
    if (value !== undefined) {
      forms[name] = value
    }
  }

  return Object.keys(forms).length > 0 ? forms : undefined
}

function readStaticSelectObjectValue(node: SourceNode): Record<string, string> | undefined {
  if (!isObjectExpression(node)) return undefined
  const values: Record<string, string> = {}

  for (const property of node.properties) {
    if (!isObjectProperty(property) || property.computed) return undefined
    const key = readPropertyKey(property.key)
    const value = readStaticString(property.value)
    if (!key || value === undefined) return undefined
    values[key] = value
  }

  return values
}

function readJsxStaticObject(openingElement: JSXOpeningElementNode, name: string): Record<string, string> | undefined {
  const attribute = findJsxAttribute(openingElement, name)
  if (!attribute?.value) return undefined
  if (attribute.value.type !== 'JSXExpressionContainer') return undefined
  return readStaticSelectObjectValue((attribute.value as JSXExpressionContainerNode).expression)
}

function readJsxStaticAttribute(openingElement: JSXOpeningElementNode, name: string): string | undefined {
  return readJsxAttributeValue(findJsxAttribute(openingElement, name))
}

function readJsxStaticNumber(openingElement: JSXOpeningElementNode, name: string): number | undefined {
  const attribute = findJsxAttribute(openingElement, name)
  if (!attribute?.value || attribute.value.type !== 'JSXExpressionContainer') return undefined
  const expression = (attribute.value as JSXExpressionContainerNode).expression
  return expression.type === 'NumericLiteral' ? (expression as NumericLiteralNode).value : undefined
}

function findJsxAttribute(openingElement: JSXOpeningElementNode, name: string): JSXAttributeNode | undefined {
  return openingElement.attributes.find((attribute) => {
    return isJsxAttribute(attribute) && attribute.name.name === name
  }) as JSXAttributeNode | undefined
}

function readJsxAttributeValue(attribute: JSXAttributeNode | undefined): string | undefined {
  if (!attribute?.value) return undefined

  if (attribute.value.type === 'StringLiteral') {
    return (attribute.value as StringLiteralNode).value
  }

  if (attribute.value.type === 'JSXExpressionContainer') {
    return readStaticString((attribute.value as JSXExpressionContainerNode).expression)
  }

  return undefined
}

function readJsxName(node: SourceNode): string | undefined {
  return node.type === 'JSXIdentifier' ? (node as JSXIdentifierNode).name : undefined
}

function readStaticString(node: SourceNode): string | undefined {
  if (node.type === 'StringLiteral') {
    return (node as StringLiteralNode).value
  }

  if (node.type === 'TemplateLiteral') {
    const template = node as TemplateLiteralNode
    if (template.expressions.length === 0 && template.quasis.length === 1) {
      return template.quasis[0]!.value.cooked ?? template.quasis[0]!.value.raw
    }
  }

  return undefined
}

function readPropertyKey(node: SourceNode): string | undefined {
  if (isIdentifier(node)) return node.name
  if (node.type === 'StringLiteral') return (node as StringLiteralNode).value
  return undefined
}

function isImportDeclaration(node: SourceNode): node is ImportDeclarationNode {
  return node.type === 'ImportDeclaration'
}

function isImportSpecifier(node: SourceNode): node is ImportSpecifierNode {
  return node.type === 'ImportSpecifier'
}

function isVariableDeclarator(node: SourceNode): node is VariableDeclaratorNode {
  return node.type === 'VariableDeclarator'
}

function isObjectPattern(node: SourceNode): node is ObjectPatternNode {
  return node.type === 'ObjectPattern'
}

function isObjectExpression(node: SourceNode): node is ObjectExpressionNode {
  return node.type === 'ObjectExpression'
}

function isObjectProperty(node: SourceNode): node is ObjectPropertyNode {
  return node.type === 'ObjectProperty'
}

function isCallExpression(node: SourceNode): node is CallExpressionNode {
  return node.type === 'CallExpression'
}

function isMemberExpression(node: SourceNode): node is MemberExpressionNode {
  return node.type === 'MemberExpression'
}

function isIdentifier(node: SourceNode | undefined | null): node is IdentifierNode {
  return node?.type === 'Identifier'
}

function isJsxElement(node: SourceNode): node is JSXElementNode {
  return node.type === 'JSXElement'
}

function isJsxAttribute(node: SourceNode): node is JSXAttributeNode {
  return node.type === 'JSXAttribute'
}

function readImportedName(specifier: ImportSpecifierNode): string | undefined {
  const imported = specifier.imported
  if (imported.type === 'Identifier') return imported.name
  if (imported.type === 'StringLiteral') return imported.value
  return undefined
}

/**
 * Inject the catalog import statement at the top of the module.
 */
export function injectCatalogImport(code: string, strategy: 'dynamic' | 'static' | 'per-route', hashes: Set<string>, hashFn?: HashFunction): string {
  if (strategy === 'dynamic') {
    return `import { __catalog } from 'virtual:fluenti/runtime';\n${code}`
  }

  if (strategy === 'per-route') {
    return `import { __catalog } from 'virtual:fluenti/route-runtime';\n${code}`
  }

  // Static: import named exports directly
  const hash = hashFn ?? defaultHashMessage
  const imports = [...hashes].map((id) => `_${hash(id)}`).join(', ')
  return `import { ${imports} } from 'virtual:fluenti/messages';\n${code}`
}
