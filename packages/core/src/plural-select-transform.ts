import {
  PLURAL_CATEGORIES,
  buildICUPluralMessage,
  buildICUSelectMessage,
  normalizeSelectForms,
  offsetIndices,
  type PluralCategory,
} from './icu-builders'
import { parseSourceModule, walkSourceAst, type SourceNode } from './source-analysis'
import { collectProgramBindingNames } from './scope-bindings'
import { createUniqueName } from './scope-resolution'
import { isImportDeclaration, isImportSpecifier } from './scope-ast-helpers'
import { readImportedName } from './scope-read'

export interface PluralSelectTransformOptions {
  framework: string
  componentModuleImport?: string
}

export interface PluralSelectTransformResult {
  code: string
  transformed: boolean
}

interface ProgramNode extends SourceNode {
  type: 'Program'
  body: SourceNode[]
}

interface ImportDeclarationNode extends SourceNode {
  type: 'ImportDeclaration'
  source: { value: string }
  specifiers: SourceNode[]
}

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

interface JSXFragmentNode extends SourceNode {
  type: 'JSXFragment'
  children: SourceNode[]
}

interface StringLiteralNode extends SourceNode {
  type: 'StringLiteral'
  value: string
}

interface NumericLiteralNode extends SourceNode {
  type: 'NumericLiteral'
  value: number
}

interface UnaryExpressionNode extends SourceNode {
  type: 'UnaryExpression'
  operator: string
  argument: SourceNode
}

interface TemplateElementNode extends SourceNode {
  type: 'TemplateElement'
  value: {
    cooked?: string
    raw: string
  }
}

interface TemplateLiteralNode extends SourceNode {
  type: 'TemplateLiteral'
  expressions: SourceNode[]
  quasis: TemplateElementNode[]
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

interface IdentifierNode extends SourceNode {
  type: 'Identifier'
  name: string
}

interface Replacement {
  start: number
  end: number
  text: string
  importKind?: 'plainPlural' | 'richPlural' | 'plainSelect' | 'richSelect'
}

interface ExtractedStaticRichValue {
  message: string
  components: string[]
}

interface BoundComponents {
  plural: Set<string>
  select: Set<string>
  compiledPlural?: string
  compiledSelect?: string
  compiledRichPlural?: string
  compiledRichSelect?: string
}

interface CompiledLocals {
  plural?: string
  select?: string
  richPlural?: string
  richSelect?: string
}

const RESERVED_SELECT_PROPS = new Set(['value', 'id', 'context', 'comment', 'options', 'other', 'tag'])

export function transformPluralSelectComponents(
  code: string,
  options: PluralSelectTransformOptions,
): PluralSelectTransformResult {
  if (options.framework !== 'react' && options.framework !== 'solid') {
    return { code, transformed: false }
  }

  const ast = parseSourceModule(code)
  if (!ast || ast.type !== 'Program') {
    return { code, transformed: false }
  }

  const program = ast as ProgramNode
  const componentModuleImport = options.componentModuleImport ?? `@fluenti/${options.framework}/components`
  const frameworkSource = `@fluenti/${options.framework}`
  const bound = collectBoundComponents(program, frameworkSource, componentModuleImport)
  if (bound.plural.size === 0 && bound.select.size === 0) {
    return { code, transformed: false }
  }

  const programBindings = collectProgramBindingNames(program)
  const compiledLocals: CompiledLocals = {}

  if (bound.plural.size > 0) {
    compiledLocals.plural = bound.compiledPlural ?? createUniqueName('__FluentiCompiledPlural', programBindings)
    programBindings.add(compiledLocals.plural)
    compiledLocals.richPlural = bound.compiledRichPlural ?? createUniqueName('__FluentiCompiledRichPlural', programBindings)
    programBindings.add(compiledLocals.richPlural)
  }

  if (bound.select.size > 0) {
    compiledLocals.select = bound.compiledSelect ?? createUniqueName('__FluentiCompiledSelect', programBindings)
    programBindings.add(compiledLocals.select)
    compiledLocals.richSelect = bound.compiledRichSelect ?? createUniqueName('__FluentiCompiledRichSelect', programBindings)
    programBindings.add(compiledLocals.richSelect)
  }

  const replacements: Replacement[] = []
  let usedPlainPlural = false
  let usedRichPlural = false
  let usedPlainSelect = false
  let usedRichSelect = false

  walkSourceAst(program, (node: SourceNode) => {
    if (node.type !== 'JSXElement') return

    const element = node as JSXElementNode
    const tagName = readJsxTagName(element.openingElement.name)
    if (!tagName) return

    if (bound.plural.has(tagName) && compiledLocals.plural) {
      const replacement = buildPluralReplacement(element, code, {
        plain: compiledLocals.plural,
        rich: compiledLocals.richPlural,
        framework: options.framework,
      })
      if (replacement) {
        replacements.push(replacement)
        usedPlainPlural ||= replacement.importKind === 'plainPlural'
        usedRichPlural ||= replacement.importKind === 'richPlural'
      }
      return
    }

    if (bound.select.has(tagName) && compiledLocals.select && compiledLocals.richSelect) {
      const replacement = buildSelectReplacement(element, code, {
        plain: compiledLocals.select,
        rich: compiledLocals.richSelect,
      })
      if (replacement) {
        replacements.push(replacement)
        usedPlainSelect ||= replacement.importKind === 'plainSelect'
        usedRichSelect ||= replacement.importKind === 'richSelect'
      }
    }
  })

  if (replacements.length === 0) {
    return { code, transformed: false }
  }

  const missingImports: string[] = []
  if (usedPlainPlural && compiledLocals.plural && !bound.compiledPlural) {
    missingImports.push(`__FluentiCompiledPlural${compiledLocals.plural === '__FluentiCompiledPlural' ? '' : ` as ${compiledLocals.plural}`}`)
  }
  if (usedRichPlural && compiledLocals.richPlural && !bound.compiledRichPlural) {
    missingImports.push(`__FluentiCompiledRichPlural${compiledLocals.richPlural === '__FluentiCompiledRichPlural' ? '' : ` as ${compiledLocals.richPlural}`}`)
  }
  if (usedPlainSelect && compiledLocals.select && !bound.compiledSelect) {
    missingImports.push(`__FluentiCompiledSelect${compiledLocals.select === '__FluentiCompiledSelect' ? '' : ` as ${compiledLocals.select}`}`)
  }
  if (usedRichSelect && compiledLocals.richSelect && !bound.compiledRichSelect) {
    missingImports.push(`__FluentiCompiledRichSelect${compiledLocals.richSelect === '__FluentiCompiledRichSelect' ? '' : ` as ${compiledLocals.richSelect}`}`)
  }

  if (missingImports.length > 0) {
    const insertionPoint = findImportInsertionPoint(program)
    replacements.push({
      start: insertionPoint,
      end: insertionPoint,
      text: `${getImportInsertionPrefix(code, insertionPoint)}import { ${missingImports.join(', ')} } from '${componentModuleImport}'\n`,
    })
  }

  replacements.sort((a, b) => b.start - a.start)
  let result = code
  for (const replacement of replacements) {
    result = result.slice(0, replacement.start) + replacement.text + result.slice(replacement.end)
  }

  return { code: result, transformed: true }
}

function collectBoundComponents(
  program: ProgramNode,
  frameworkSource: string,
  componentSource: string,
): BoundComponents {
  const plural = new Set<string>()
  const select = new Set<string>()
  let compiledPlural: string | undefined
  let compiledSelect: string | undefined
  let compiledRichPlural: string | undefined
  let compiledRichSelect: string | undefined

  for (const statement of program.body) {
    if (!isImportDeclaration(statement)) continue

    const declaration = statement as ImportDeclarationNode
    const source = declaration.source.value
    if (source !== frameworkSource && source !== componentSource) continue

    for (const specifier of declaration.specifiers) {
      if (!isImportSpecifier(specifier)) continue
      const importedName = readImportedName(specifier)
      if (!importedName) continue

      if (importedName === 'Plural') {
        plural.add(specifier.local.name)
      } else if (importedName === 'Select') {
        select.add(specifier.local.name)
      } else if (source === componentSource && importedName === '__FluentiCompiledPlural') {
        compiledPlural = specifier.local.name
      } else if (source === componentSource && importedName === '__FluentiCompiledSelect') {
        compiledSelect = specifier.local.name
      } else if (source === componentSource && importedName === '__FluentiCompiledRichPlural') {
        compiledRichPlural = specifier.local.name
      } else if (source === componentSource && importedName === '__FluentiCompiledRichSelect') {
        compiledRichSelect = specifier.local.name
      }
    }
  }

  return {
    plural,
    select,
    ...(compiledPlural !== undefined ? { compiledPlural } : {}),
    ...(compiledSelect !== undefined ? { compiledSelect } : {}),
    ...(compiledRichPlural !== undefined ? { compiledRichPlural } : {}),
    ...(compiledRichSelect !== undefined ? { compiledRichSelect } : {}),
  }
}

function buildPluralReplacement(
  element: JSXElementNode,
  code: string,
  options: {
    plain: string
    rich: string | undefined
    framework: string
  },
): Replacement | undefined {
  if (hasMeaningfulChildren(element.children)) return undefined

  const attributes = element.openingElement.attributes
  if (attributes.some((attribute) => attribute.type === 'JSXSpreadAttribute')) return undefined

  const valueAttr = findJsxAttribute(attributes, 'value')
  if (!valueAttr) return undefined

  const forms: Partial<Record<PluralCategory, ExtractedStaticRichValue>> = {}
  for (const category of PLURAL_CATEGORIES) {
    const attr = findJsxAttribute(attributes, category)
    if (!attr) continue
    const value = extractStaticRichAttributeValue(attr, code)
    if (value === undefined) return undefined
    forms[category] = value
  }

  if (forms.other === undefined) return undefined

  const offsetAttr = findJsxAttribute(attributes, 'offset')
  const offset = offsetAttr ? readStaticNumberAttributeValue(offsetAttr) : undefined
  if (offsetAttr && offset === undefined) return undefined

  const combined = combineRichForms(PLURAL_CATEGORIES, forms as Partial<Record<PluralCategory, ExtractedStaticRichValue>> & { other: ExtractedStaticRichValue })
  const message = buildICUPluralMessage(combined.messages as Partial<Record<PluralCategory, string>> & { other: string }, offset)
  const compiledLocal = combined.components.length > 0 ? options.rich : options.plain
  if (!compiledLocal) return undefined
  const propSources = [
    renderAttrSource(valueAttr, code),
    `message={${JSON.stringify(message)}}`,
  ]

  const idAttr = findJsxAttribute(attributes, 'id')
  const contextAttr = findJsxAttribute(attributes, 'context')
  const commentAttr = findJsxAttribute(attributes, 'comment')
  const tagAttr = options.framework === 'solid' ? findJsxAttribute(attributes, 'tag') : undefined

  if (idAttr) propSources.push(renderAttrSource(idAttr, code))
  if (contextAttr) propSources.push(renderAttrSource(contextAttr, code))
  if (commentAttr) propSources.push(renderAttrSource(commentAttr, code))
  if (tagAttr) propSources.push(renderAttrSource(tagAttr, code))
  if (combined.components.length > 0) {
    propSources.push(`components={[${combined.components.join(', ')}]}`)
  }

  return {
    start: element.start!,
    end: element.end!,
    text: `<${compiledLocal} ${propSources.join(' ')} />`,
    importKind: combined.components.length > 0 ? 'richPlural' : 'plainPlural',
  }
}

function buildSelectReplacement(
  element: JSXElementNode,
  code: string,
  options: {
    plain: string
    rich: string
  },
): Replacement | undefined {
  if (hasMeaningfulChildren(element.children)) return undefined

  const attributes = element.openingElement.attributes
  if (attributes.some((attribute) => attribute.type === 'JSXSpreadAttribute')) return undefined

  const valueAttr = findJsxAttribute(attributes, 'value')
  if (!valueAttr) return undefined

  const otherAttr = findJsxAttribute(attributes, 'other')
  if (!otherAttr) return undefined
  const otherValue = extractStaticRichAttributeValue(otherAttr, code)
  if (otherValue === undefined) return undefined

  const optionsAttr = findJsxAttribute(attributes, 'options')
  const directForms = optionsAttr === undefined
    ? readDirectSelectForms(attributes, code)
    : undefined
  const optionForms = optionsAttr ? readStaticOptionsObject(optionsAttr, code) : undefined

  if (optionsAttr && optionForms === undefined) return undefined
  if (!optionsAttr && directForms === undefined) return undefined

  const forms = optionsAttr
    ? { ...optionForms!, other: otherValue }
    : { ...directForms!, other: otherValue }
  const orderedKeys = [...Object.keys(forms).filter((key) => key !== 'other'), 'other']
  const combined = combineRichForms(orderedKeys, forms)

  const normalized = normalizeSelectForms(combined.messages)
  const message = buildICUSelectMessage(normalized.forms)
  const compiledLocal = combined.components.length > 0 ? options.rich : options.plain

  const propSources = [
    renderAttrSource(valueAttr, code),
    `message={${JSON.stringify(message)}}`,
    `valueMap={${JSON.stringify(normalized.valueMap)}}`,
  ]

  const idAttr = findJsxAttribute(attributes, 'id')
  const contextAttr = findJsxAttribute(attributes, 'context')
  const commentAttr = findJsxAttribute(attributes, 'comment')
  const tagAttr = findJsxAttribute(attributes, 'tag')

  if (idAttr) propSources.push(renderAttrSource(idAttr, code))
  if (contextAttr) propSources.push(renderAttrSource(contextAttr, code))
  if (commentAttr) propSources.push(renderAttrSource(commentAttr, code))
  if (tagAttr) propSources.push(renderAttrSource(tagAttr, code))
  if (combined.components.length > 0) {
    propSources.push(`components={[${combined.components.join(', ')}]}`)
  }

  return {
    start: element.start!,
    end: element.end!,
    text: `<${compiledLocal} ${propSources.join(' ')} />`,
    importKind: combined.components.length > 0 ? 'richSelect' : 'plainSelect',
  }
}

function readDirectSelectForms(
  attributes: SourceNode[],
  code: string,
): Record<string, ExtractedStaticRichValue> | undefined {
  const forms: Record<string, ExtractedStaticRichValue> = {}

  for (const attribute of attributes) {
    if (attribute.type !== 'JSXAttribute') continue
    const attr = attribute as JSXAttributeNode
    const name = attr.name.name
    if (RESERVED_SELECT_PROPS.has(name)) continue

    const value = extractStaticRichAttributeValue(attr, code)
    if (value === undefined) return undefined
    forms[name] = value
  }

  return forms
}

function readStaticOptionsObject(
  attribute: JSXAttributeNode,
  code: string,
): Record<string, ExtractedStaticRichValue> | undefined {
  if (!attribute.value || attribute.value.type !== 'JSXExpressionContainer') return undefined
  const expression = (attribute.value as JSXExpressionContainerNode).expression
  if (expression.type !== 'ObjectExpression') return undefined

  const forms: Record<string, ExtractedStaticRichValue> = {}
  const objectExpression = expression as ObjectExpressionNode

  for (const property of objectExpression.properties) {
    if (property.type !== 'ObjectProperty') return undefined
    const objectProperty = property as ObjectPropertyNode
    if (objectProperty.computed) return undefined

    const key = readObjectPropertyKey(objectProperty.key)
    const value = extractStaticRichExpression(objectProperty.value, code)
    if (key === undefined || value === undefined) return undefined
    forms[key] = value
  }

  return forms
}

function combineRichForms<T extends string>(
  orderedKeys: readonly T[],
  forms: Record<string, ExtractedStaticRichValue>,
): {
  messages: Record<string, string>
  components: string[]
} {
  const messages: Record<string, string> = {}
  const components: string[] = []

  for (const key of orderedKeys) {
    const form = forms[key]
    if (!form) continue
    messages[key] = offsetIndices(form.message, components.length)
    components.push(...form.components)
  }

  return { messages, components }
}

function extractStaticRichAttributeValue(
  attribute: JSXAttributeNode,
  code: string,
): ExtractedStaticRichValue | undefined {
  if (!attribute.value) return undefined
  if (attribute.value.type === 'StringLiteral') {
    return {
      message: (attribute.value as StringLiteralNode).value,
      components: [],
    }
  }
  if (attribute.value.type !== 'JSXExpressionContainer') return undefined
  return extractStaticRichExpression((attribute.value as JSXExpressionContainerNode).expression, code)
}

function extractStaticRichExpression(
  node: SourceNode,
  code: string,
): ExtractedStaticRichValue | undefined {
  if (node.type === 'StringLiteral') {
    return { message: (node as StringLiteralNode).value, components: [] }
  }
  if (node.type === 'NumericLiteral') {
    return { message: String((node as NumericLiteralNode).value), components: [] }
  }
  if (node.type === 'TemplateLiteral') {
    const template = node as TemplateLiteralNode
    if (template.expressions.length > 0) return undefined
    return {
      message: template.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join(''),
      components: [],
    }
  }
  if (node.type === 'JSXElement') {
    return extractStaticRichNodes([node], code)
  }
  if (node.type === 'JSXFragment') {
    return extractStaticRichNodes((node as JSXFragmentNode).children, code)
  }
  return undefined
}

function extractStaticRichNodes(
  nodes: SourceNode[],
  code: string,
): ExtractedStaticRichValue | undefined {
  const components: string[] = []
  let message = ''

  for (const node of nodes) {
    if (node.type === 'JSXText') {
      message += (node as JSXTextNode).value
      continue
    }

    if (node.type === 'JSXExpressionContainer') {
      const expression = (node as JSXExpressionContainerNode).expression
      if (expression.type === 'JSXEmptyExpression') continue
      const extractedExpression = extractStaticRichExpression(expression, code)
      if (!extractedExpression) return undefined
      message += offsetIndices(extractedExpression.message, components.length)
      components.push(...extractedExpression.components)
      continue
    }

    if (node.type === 'JSXFragment') {
      const extractedFragment = extractStaticRichNodes((node as JSXFragmentNode).children, code)
      if (!extractedFragment) return undefined
      message += offsetIndices(extractedFragment.message, components.length)
      components.push(...extractedFragment.components)
      continue
    }

    if (node.type === 'JSXElement') {
      const element = node as JSXElementNode
      const childTagName = readJsxTagName(element.openingElement.name)
      if (!childTagName) return undefined

      const idx = components.length
      const attrsSource = extractAttributesSource(element.openingElement, code)
      components.push(`<${childTagName}${attrsSource} />`)

      if (element.children.length > 0) {
        const inner = extractStaticRichNodes(element.children, code)
        if (!inner) return undefined
        message += `<${idx}>${offsetIndices(inner.message, idx + 1)}</${idx}>`
        components.push(...inner.components)
      } else {
        message += `<${idx}/>`
      }
      continue
    }

    return undefined
  }

  return { message: message.trim(), components }
}

function readObjectPropertyKey(node: SourceNode): string | undefined {
  if (node.type === 'Identifier') {
    return (node as IdentifierNode).name
  }
  if (node.type === 'StringLiteral') {
    return (node as StringLiteralNode).value
  }
  if (node.type === 'NumericLiteral') {
    return String((node as NumericLiteralNode).value)
  }
  return undefined
}

function readStaticNumberAttributeValue(attribute: JSXAttributeNode): number | undefined {
  if (!attribute.value) return undefined
  if (attribute.value.type !== 'JSXExpressionContainer') return undefined
  const expression = (attribute.value as JSXExpressionContainerNode).expression
  return readStaticNumberExpression(expression)
}

function readStaticNumberExpression(node: SourceNode): number | undefined {
  if (node.type === 'NumericLiteral') {
    return (node as NumericLiteralNode).value
  }
  if (node.type === 'UnaryExpression') {
    const unary = node as UnaryExpressionNode
    if (unary.operator === '-' && unary.argument.type === 'NumericLiteral') {
      return -((unary.argument as NumericLiteralNode).value)
    }
  }
  return undefined
}

function hasMeaningfulChildren(children: SourceNode[]): boolean {
  for (const child of children) {
    if (child.type === 'JSXText') {
      if ((child as JSXTextNode).value.trim().length > 0) return true
      continue
    }
    if (child.type === 'JSXExpressionContainer') {
      const expression = (child as JSXExpressionContainerNode).expression
      if (expression.type === 'JSXEmptyExpression') continue
    }
    return true
  }
  return false
}

function findImportInsertionPoint(program: ProgramNode): number {
  let lastImportEnd = 0
  for (const statement of program.body) {
    if (isImportDeclaration(statement)) {
      lastImportEnd = statement.end ?? lastImportEnd
      continue
    }
    break
  }
  return lastImportEnd
}

function getImportInsertionPrefix(code: string, insertionPoint: number): string {
  if (insertionPoint <= 0) return ''
  return code[insertionPoint - 1] === '\n' ? '' : '\n'
}

function renderAttrSource(attribute: JSXAttributeNode, code: string): string {
  return code.slice(attribute.start!, attribute.end!)
}

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

function findJsxAttribute(
  attributes: SourceNode[],
  name: string,
): JSXAttributeNode | undefined {
  for (const attribute of attributes) {
    if (attribute.type !== 'JSXAttribute') continue
    const jsxAttribute = attribute as JSXAttributeNode
    if (jsxAttribute.name.type === 'JSXIdentifier' && jsxAttribute.name.name === name) {
      return jsxAttribute
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
