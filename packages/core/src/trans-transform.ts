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
import { collectProgramBindingNames } from './scope-bindings'
import { createUniqueName } from './scope-resolution'
import { isImportDeclaration, isImportSpecifier } from './scope-ast-helpers'
import { readImportedName } from './scope-read'
import { parseSourceModule, walkSourceAst, type SourceNode } from './source-analysis'

export interface TransTransformResult {
  code: string
  transformed: boolean
}

export interface TransTransformOptions {
  framework?: string
  componentModuleImport?: string
}

// ─── AST node interfaces ─────────────────────────────────────────────────────

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

interface StringLiteralNode extends SourceNode {
  type: 'StringLiteral'
  value: string
}

// ─── Replacement tracking ────────────────────────────────────────────────────

interface Replacement {
  start: number
  end: number
  text: string
  importKind?: 'plainTrans' | 'richTrans'
}

interface BoundTransComponents {
  trans: Set<string>
  compiledTrans?: string
  compiledRichTrans?: string
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
export function transformTransComponents(
  code: string,
  options: TransTransformOptions = {},
): TransTransformResult {
  const ast = parseSourceModule(code)
  if (!ast || ast.type !== 'Program') {
    return { code, transformed: false }
  }

  const program = ast as ProgramNode
  if (options.framework === 'solid') {
    return transformSolidTransComponents(program, code, options)
  }
  if (options.framework === 'react') {
    return transformReactTransComponents(program, code, options)
  }

  const replacements: Replacement[] = []

  walkSourceAst(program, (node: SourceNode) => {
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

    // Replace the original element tail (`>children</Trans>`) so the compiled
    // output no longer carries the source children tree alongside the
    // precomputed fast-path props.
    const injectedProps = ` __id="${messageId}" __message="${escapedMessage}"${componentsJsx}`
    const openingEnd = element.openingElement.end!
    replacements.push({
      start: openingEnd - 1,
      end: element.end!,
      text: `${injectedProps} />`,
    })
  })

  if (replacements.length === 0) {
    return { code, transformed: false }
  }

  // Nested <Trans> replacements can overlap when the outer element is fully
  // replaced. Keep the outermost replacement only.
  const nonOverlapping = replacements
    .slice()
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .filter((replacement, index, sorted) => {
      const previous = sorted[index - 1]
      return !previous || replacement.end > previous.end
    })

  // Apply replacements in reverse source order to preserve offsets
  nonOverlapping.sort((a, b) => b.start - a.start)
  let result = code
  for (const r of nonOverlapping) {
    result = result.slice(0, r.start) + r.text + result.slice(r.end)
  }

  return { code: result, transformed: true }
}

function transformReactTransComponents(
  program: ProgramNode,
  code: string,
  options: TransTransformOptions,
): TransTransformResult {
  const componentModuleImport = options.componentModuleImport ?? '@fluenti/react/components'
  const bound = collectBoundTransComponents(program, '@fluenti/react', componentModuleImport)
  if (bound.trans.size === 0) {
    return { code, transformed: false }
  }

  const programBindings = collectProgramBindingNames(program)
  const compiledTrans = bound.compiledTrans ?? createUniqueName('__FluentiCompiledTrans', programBindings)
  programBindings.add(compiledTrans)
  const compiledRichTrans = bound.compiledRichTrans ?? createUniqueName('__FluentiCompiledRichTrans', programBindings)
  const replacements: Replacement[] = []
  let usedPlainTrans = false
  let usedRichTrans = false

  walkSourceAst(program, (node: SourceNode) => {
    if (node.type !== 'JSXElement') return

    const element = node as JSXElementNode
    const tagName = readJsxTagName(element.openingElement.name)
    if (!tagName || !bound.trans.has(tagName)) return

    const replacement = buildReactCompiledTransReplacement(element, code, compiledTrans, compiledRichTrans)
    if (!replacement) return

    replacements.push(replacement)
    usedPlainTrans ||= replacement.importKind === 'plainTrans'
    usedRichTrans ||= replacement.importKind === 'richTrans'
  })

  if (replacements.length === 0) {
    return { code, transformed: false }
  }

  const missingImports: string[] = []
  if (usedPlainTrans && !bound.compiledTrans) {
    missingImports.push(compiledTrans === '__FluentiCompiledTrans' ? '__FluentiCompiledTrans' : `__FluentiCompiledTrans as ${compiledTrans}`)
  }
  if (usedRichTrans && !bound.compiledRichTrans) {
    missingImports.push(compiledRichTrans === '__FluentiCompiledRichTrans' ? '__FluentiCompiledRichTrans' : `__FluentiCompiledRichTrans as ${compiledRichTrans}`)
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

function transformSolidTransComponents(
  program: ProgramNode,
  code: string,
  options: TransTransformOptions,
): TransTransformResult {
  const componentModuleImport = options.componentModuleImport ?? '@fluenti/solid/components'
  const bound = collectBoundTransComponents(program, '@fluenti/solid', componentModuleImport)
  if (bound.trans.size === 0) {
    return { code, transformed: false }
  }

  const programBindings = collectProgramBindingNames(program)
  const compiledTrans = bound.compiledTrans ?? createUniqueName('__FluentiCompiledTrans', programBindings)
  const replacements: Replacement[] = []
  let usedCompiledTrans = false

  walkSourceAst(program, (node: SourceNode) => {
    if (node.type !== 'JSXElement') return

    const element = node as JSXElementNode
    const tagName = readJsxTagName(element.openingElement.name)
    if (!tagName || !bound.trans.has(tagName)) return

    const replacement = buildSolidCompiledTransReplacement(element, code, compiledTrans)
    if (!replacement) return

    replacements.push(replacement)
    usedCompiledTrans = true
  })

  if (replacements.length === 0) {
    return { code, transformed: false }
  }

  if (usedCompiledTrans && !bound.compiledTrans) {
    const insertionPoint = findImportInsertionPoint(program)
    replacements.push({
      start: insertionPoint,
      end: insertionPoint,
      text: `${getImportInsertionPrefix(code, insertionPoint)}import { ${compiledTrans === '__FluentiCompiledTrans' ? '__FluentiCompiledTrans' : `__FluentiCompiledTrans as ${compiledTrans}`} } from '${componentModuleImport}'\n`,
    })
  }

  replacements.sort((a, b) => b.start - a.start)
  let result = code
  for (const replacement of replacements) {
    result = result.slice(0, replacement.start) + replacement.text + result.slice(replacement.end)
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

function collectBoundTransComponents(
  program: ProgramNode,
  frameworkSource: string,
  componentSource: string,
): BoundTransComponents {
  const trans = new Set<string>()
  let compiledTrans: string | undefined
  let compiledRichTrans: string | undefined

  for (const statement of program.body) {
    if (!isImportDeclaration(statement)) continue

    const declaration = statement as ImportDeclarationNode
    const source = declaration.source.value
    if (source !== frameworkSource && source !== componentSource) continue

    for (const specifier of declaration.specifiers) {
      if (!isImportSpecifier(specifier)) continue
      const importedName = readImportedName(specifier)
      if (!importedName) continue

      if (importedName === 'Trans') {
        trans.add(specifier.local.name)
      } else if (source === componentSource && importedName === '__FluentiCompiledTrans') {
        compiledTrans = specifier.local.name
      } else if (source === componentSource && importedName === '__FluentiCompiledRichTrans') {
        compiledRichTrans = specifier.local.name
      }
    }
  }

  return {
    trans,
    ...(compiledTrans !== undefined ? { compiledTrans } : {}),
    ...(compiledRichTrans !== undefined ? { compiledRichTrans } : {}),
  }
}

function buildReactCompiledTransReplacement(
  element: JSXElementNode,
  code: string,
  compiledLocal: string,
  compiledRichLocal: string,
): Replacement | undefined {
  if (element.openingElement.selfClosing) return undefined

  const attrs = element.openingElement.attributes
  if (attrs.some((attribute) => attribute.type === 'JSXSpreadAttribute')) return undefined
  if (findJsxAttribute(attrs, '__id') || findJsxAttribute(attrs, '__message') || findJsxAttribute(attrs, 'message')) {
    return undefined
  }

  const extracted = extractJsxChildren(element.children, code)
  if (extracted.hasDynamic || !extracted.message) return undefined

  const customId = readStaticAttribute(attrs, 'id')
  if (customId.kind === 'dynamic') return undefined

  const context = readStaticAttribute(attrs, 'context')
  if (!customId.value && context.kind === 'dynamic') return undefined

  const messageId = customId.value ?? hashMessage(extracted.message, context.value)
  const hasExplicitId = findJsxAttribute(attrs, 'id') !== undefined
  const propSources = attrs
    .filter((attribute) => attribute.start != null && attribute.end != null)
    .map((attribute) => code.slice(attribute.start!, attribute.end!))

  if (!hasExplicitId) {
    propSources.push(`id="${messageId}"`)
  }
  propSources.push(`message={${JSON.stringify(extracted.message)}}`)

  const hasComponents = extracted.componentSources.length > 0
  if (hasComponents) {
    propSources.push(`components={[${extracted.componentSources.join(', ')}]}`)
  }

  return {
    start: element.start!,
    end: element.end!,
    text: `<${hasComponents ? compiledRichLocal : compiledLocal} ${propSources.join(' ')} />`,
    importKind: hasComponents ? 'richTrans' : 'plainTrans',
  }
}

function buildSolidCompiledTransReplacement(
  element: JSXElementNode,
  code: string,
  compiledLocal: string,
): Replacement | undefined {
  if (element.openingElement.selfClosing) return undefined

  const attrs = element.openingElement.attributes
  if (attrs.some((attribute) => attribute.type === 'JSXSpreadAttribute')) return undefined
  if (findJsxAttribute(attrs, '__id') || findJsxAttribute(attrs, '__message') || findJsxAttribute(attrs, 'message')) {
    return undefined
  }

  const extracted = extractJsxChildren(element.children, code)
  if (extracted.hasDynamic || !extracted.message) return undefined

  const customId = readStaticAttribute(attrs, 'id')
  if (customId.kind === 'dynamic') return undefined

  const context = readStaticAttribute(attrs, 'context')
  if (!customId.value && context.kind === 'dynamic') return undefined

  const messageId = customId.value ?? hashMessage(extracted.message, context.value)
  const hasExplicitId = findJsxAttribute(attrs, 'id') !== undefined
  const propSources = attrs
    .filter((attribute) => attribute.start != null && attribute.end != null)
    .map((attribute) => code.slice(attribute.start!, attribute.end!))

  if (!hasExplicitId) {
    propSources.push(`id="${messageId}"`)
  }
  propSources.push(`message={${JSON.stringify(extracted.message)}}`)
  if (extracted.componentSources.length > 0) {
    propSources.push(`components={[${extracted.componentSources.join(', ')}]}`)
  }

  return {
    start: element.start!,
    end: element.end!,
    text: `<${compiledLocal} ${propSources.join(' ')} />`,
  }
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
