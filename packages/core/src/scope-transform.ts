import { createRequire } from 'node:module'
import { createMessageId } from './identity'
import { isSourceNode, parseSourceModule, type SourceNode } from './source-analysis'

interface Scope {
  bindings: Set<string>
  parent: Scope | null
}

function createScope(parent: Scope | null): Scope {
  return { bindings: new Set(), parent }
}

export interface Replacement {
  start: number
  end: number
  replacement: string
}

const FLUENTI_PACKAGES = {
  react: '@fluenti/react',
  vue: '@fluenti/vue',
  solid: '@fluenti/solid',
} as const

const NEXT_I18N_MODULES = new Set(['@fluenti/next/__generated', '@fluenti/next/server'])
const SERVER_AUTHORING_EXPORTS = new Set(['Trans', 'Plural', 'Select', 'DateTime', 'NumberFormat'])

export interface ScopeTransformOptions {
  framework: 'vue' | 'solid' | 'react'
  allowTopLevelImportedT?: boolean
  serverModuleImport?: string
  treatFrameworkDirectImportsAsServer?: boolean
  rerouteServerAuthoringImports?: boolean
  errorOnServerUseI18n?: boolean
}

export interface ScopeTransformResult {
  code: string
  transformed: boolean
}

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

interface ProgramNode extends SourceNode {
  type: 'Program'
  body: SourceNode[]
}

interface BlockStatementNode extends SourceNode {
  type: 'BlockStatement'
  body: SourceNode[]
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

interface MemberExpressionNode extends SourceNode {
  type: 'MemberExpression'
  object: SourceNode
  property: SourceNode
  computed: boolean
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

interface VariableDeclarationNode extends SourceNode {
  type: 'VariableDeclaration'
  kind: 'const' | 'let' | 'var'
  declarations: VariableDeclaratorNode[]
}

interface TaggedTemplateExpressionNode extends SourceNode {
  type: 'TaggedTemplateExpression'
  tag: SourceNode
  quasi: TemplateLiteralNode
}

interface TemplateLiteralNode extends SourceNode {
  type: 'TemplateLiteral'
  quasis: TemplateElementNode[]
  expressions: SourceNode[]
}

interface TemplateElementNode extends SourceNode {
  type: 'TemplateElement'
  value: { raw: string; cooked: string | null }
}

interface ObjectPatternNode extends SourceNode {
  type: 'ObjectPattern'
  properties: SourceNode[]
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
  shorthand?: boolean
}

interface AssignmentPatternNode extends SourceNode {
  type: 'AssignmentPattern'
  left: SourceNode
}

interface ArrayPatternNode extends SourceNode {
  type: 'ArrayPattern'
  elements: Array<SourceNode | null>
}

interface RestElementNode extends SourceNode {
  type: 'RestElement'
  argument: SourceNode
}

interface ReturnStatementNode extends SourceNode {
  type: 'ReturnStatement'
  argument: SourceNode | null
}

interface FunctionLikeNode extends SourceNode {
  body: SourceNode
  async?: boolean
  params?: SourceNode[]
  id?: SourceNode | null
  expression?: boolean
}

interface ImportBindings {
  useI18n: Set<string>
  getI18n: Set<string>
  directClientT: Map<string, DirectImportBinding>
  directServerT: Map<string, DirectImportBinding>
  frameworkImports: ImportDeclarationNode[]
  serverImports: ImportDeclarationNode[]
}

interface DirectImportBinding {
  local: string
  source: string
  declaration: ImportDeclarationNode
  kind: 'client' | 'server'
}

interface TargetContext {
  node: ProgramNode | FunctionLikeNode
  scope: Scope
  clientEligible: boolean
  serverEligible: boolean
  helperNames: Partial<Record<'client' | 'server', string>>
  needsHelper: Set<'client' | 'server'>
}

interface TemplateTranslationParts {
  message: string
  values: SourceNode[]
}

interface StaticDescriptor {
  id?: string
  message: string
  context?: string
}

function classifyExpression(expr: string): string {
  const trimmed = expr.trim()
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
    return trimmed
  }
  if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(trimmed) && !trimmed.endsWith('.')) {
    const parts = trimmed.split('.')
    return parts[parts.length - 1]!
  }
  return ''
}

const require = createRequire(import.meta.url)
let generateCode:
  | ((ast: unknown, options?: unknown) => { code: string })
  | null = null

function getGenerateCode(): (ast: unknown, options?: unknown) => { code: string } {
  if (generateCode) return generateCode

  const generatorModule = require('@babel/generator') as {
    default?: (ast: unknown, options?: unknown) => { code: string }
  }

  generateCode = typeof generatorModule.default === 'function'
    ? generatorModule.default
    : (generatorModule as unknown as (ast: unknown, options?: unknown) => { code: string })

  return generateCode
}

export function scopeTransform(
  code: string,
  options: ScopeTransformOptions,
): ScopeTransformResult {
  const ast = parseSourceModule(code)
  if (!ast || ast.type !== 'Program') {
    return { code, transformed: false }
  }

  const program = ast as ProgramNode
  const importBindings = collectImportBindings(program, options)
  const trackedTBindings = collectTrackedTBindings(program, importBindings)
  const hasTrackedBindings = trackedTBindings.size > 0
  const hasDirectImports = importBindings.directClientT.size > 0 || importBindings.directServerT.size > 0
  const hasServerAuthoringImports = options.rerouteServerAuthoringImports
    && importBindings.frameworkImports.some((declaration) => {
      return declaration.specifiers.some((specifier) => {
        if (!isImportSpecifier(specifier)) return false
        const importedName = readImportedName(specifier)
        return importedName !== undefined && SERVER_AUTHORING_EXPORTS.has(importedName)
      })
    })

  if (!hasTrackedBindings && !hasDirectImports && !hasServerAuthoringImports) {
    return { code, transformed: false }
  }

  const programBindings = collectProgramBindingNames(program)
  const helperLocals = {
    client: importBindings.useI18n.size > 0
      ? [...importBindings.useI18n][0]!
      : createUniqueName('useI18n', programBindings),
    server: importBindings.getI18n.size > 0
      ? [...importBindings.getI18n][0]!
      : createUniqueName('getI18n', programBindings),
  }

  const targets = new Map<SourceNode, TargetContext>()
  const consumedDirectBindings = new Set<string>()
  let transformed = false
  let needsClientImport = false
  let needsServerImport = false

  function walk(
    node: SourceNode,
    parent: SourceNode | null,
    scope: Scope,
    activeTargets: TargetContext[],
  ): void {
    switch (node.type) {
      case 'Program': {
        const nextScope = createScope(scope)
        collectBlockBindings(node, nextScope, importBindings)
        const nextTargets = [...activeTargets]

        if (options.framework === 'vue' && options.allowTopLevelImportedT) {
          const target = createTargetContext(node as ProgramNode, nextScope, true, false)
          targets.set(node, target)
          nextTargets.push(target)
        }

        walkChildren(node, nextScope, nextTargets)
        return
      }

      case 'BlockStatement':
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'SwitchStatement': {
        const nextScope = createScope(scope)
        collectBlockBindings(node, nextScope, importBindings)
        walkChildren(node, nextScope, activeTargets)
        return
      }

      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
      case 'ObjectMethod':
      case 'ClassMethod': {
        const nextScope = createScope(scope)
        collectFunctionBindings(node, nextScope, importBindings)

        const target = createFunctionTarget(node as FunctionLikeNode, parent, nextScope, options)
        const nextTargets = target ? [...activeTargets, target] : activeTargets
        if (target) {
          targets.set(node, target)
        }

        walkChildren(node, nextScope, nextTargets)
        return
      }

      case 'CatchClause': {
        const nextScope = createScope(scope)
        if (isSourceNode(node['param'])) {
          collectPatternNames(node['param'], nextScope)
        }
        walkChildren(node, nextScope, activeTargets)
        return
      }

      case 'TaggedTemplateExpression': {
        const tagged = node as TaggedTemplateExpressionNode
        if (!isIdentifier(tagged.tag)) {
          walkChildren(node, scope, activeTargets)
          return
        }

        const directBinding = resolveDirectBinding(tagged.tag.name, scope, importBindings)
        if (directBinding) {
          const target = resolveTargetForBinding(activeTargets, directBinding.kind)
          if (!target) {
            throwDirectImportScopeError(directBinding, options)
          }

          const replacement = directBinding.kind === 'server'
            ? buildImportedServerTaggedTemplateCall(
              code,
              tagged,
              ensureTargetHelper(target, directBinding.kind),
            )
            : buildImportedTaggedTemplateCall(code, tagged, ensureTargetHelper(target, directBinding.kind))
          overwriteNode(tagged, replacement)
          consumedDirectBindings.add(directBinding.local)
          transformed = true
          if (directBinding.kind === 'client' && importBindings.useI18n.size === 0) {
            needsClientImport = true
          }
          if (directBinding.kind === 'server' && importBindings.getI18n.size === 0) {
            needsServerImport = true
          }
          return
        }

        if (trackedTBindings.has(tagged.tag.name) && !isShadowed(scope, tagged.tag.name)) {
          overwriteNode(tagged, buildRuntimeTaggedTemplateCall(code, tagged, tagged.tag.name))
          transformed = true
          return
        }

        walkChildren(node, scope, activeTargets)
        return
      }

      case 'CallExpression': {
        const call = node as CallExpressionNode
        if (!isIdentifier(call.callee)) {
          walkChildren(node, scope, activeTargets)
          return
        }

        const directBinding = resolveDirectBinding(call.callee.name, scope, importBindings)
        if (!directBinding) {
          walkChildren(node, scope, activeTargets)
          return
        }

        const target = resolveTargetForBinding(activeTargets, directBinding.kind)
        if (!target) {
          throwDirectImportScopeError(directBinding, options)
        }

        const replacement = directBinding.kind === 'server'
          ? buildImportedServerDescriptorCall(call, ensureTargetHelper(target, directBinding.kind))
          : buildImportedDescriptorCall(call, ensureTargetHelper(target, directBinding.kind))
        overwriteNode(call, replacement)
        consumedDirectBindings.add(directBinding.local)
        transformed = true
        if (directBinding.kind === 'client' && importBindings.useI18n.size === 0) {
          needsClientImport = true
        }
        if (directBinding.kind === 'server' && importBindings.getI18n.size === 0) {
          needsServerImport = true
        }
        return
      }

      default:
        walkChildren(node, scope, activeTargets)
    }
  }

  function walkChildren(
    node: SourceNode,
    scope: Scope,
    activeTargets: TargetContext[],
  ): void {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue

      if (Array.isArray(value)) {
        for (const child of value) {
          if (isSourceNode(child)) {
            walk(child, node, scope, activeTargets)
          }
        }
        continue
      }

      if (isSourceNode(value)) {
        walk(value, node, scope, activeTargets)
      }
    }
  }

  walk(program, null, createScope(null), [])

  if (!transformed && !hasServerAuthoringImports) {
    return { code, transformed: false }
  }

  if (hasServerAuthoringImports) {
    transformed = true
  }

  finalizeImports(
    program,
    consumedDirectBindings,
    helperLocals,
    needsClientImport,
    needsServerImport,
    options,
  )

  injectHelpers(program, targets, helperLocals)

  const output = getGenerateCode()(program as never, {
    retainLines: true,
    jsescOption: { quotes: 'single', minimal: true },
  }).code

  return { code: output, transformed: true }
}

function collectImportBindings(
  ast: ProgramNode,
  options: ScopeTransformOptions,
): ImportBindings {
  const bindings: ImportBindings = {
    useI18n: new Set<string>(),
    getI18n: new Set<string>(),
    directClientT: new Map<string, DirectImportBinding>(),
    directServerT: new Map<string, DirectImportBinding>(),
    frameworkImports: [],
    serverImports: [],
  }

  const frameworkSource = FLUENTI_PACKAGES[options.framework]
  const serverSource = options.serverModuleImport ?? '@fluenti/next/__generated'
  const frameworkServerSymbols = new Set<string>()
  const generatedServerSymbols = new Set<string>()

  for (const entry of ast.body) {
    if (!isImportDeclaration(entry)) continue

    const source = entry.source.value
    if (source === frameworkSource) {
      bindings.frameworkImports.push(entry)
    }
    if (source === serverSource) {
      bindings.serverImports.push(entry)
    }

    for (const specifier of entry.specifiers) {
      if (!isImportSpecifier(specifier)) continue

      const importedName = readImportedName(specifier)
      if (!importedName) continue

      if (source === frameworkSource && importedName === 'useI18n') {
        if (options.errorOnServerUseI18n) {
          throw new Error(
            `[fluenti] useI18n() is client-only in Next server files. ` +
              `Use direct imports from '${frameworkSource}' for authoring, or await getI18n() from '${serverSource}' for runtime access.`,
          )
        }
        bindings.useI18n.add(specifier.local.name)
      }

      if (NEXT_I18N_MODULES.has(source) && importedName === 'getI18n') {
        bindings.getI18n.add(specifier.local.name)
      }

      if (source === frameworkSource && importedName === 't') {
        const targetMap = options.treatFrameworkDirectImportsAsServer
          ? bindings.directServerT
          : bindings.directClientT
        targetMap.set(specifier.local.name, {
          local: specifier.local.name,
          source,
          declaration: entry,
          kind: options.treatFrameworkDirectImportsAsServer ? 'server' : 'client',
        })
        if (options.rerouteServerAuthoringImports && options.treatFrameworkDirectImportsAsServer) {
          frameworkServerSymbols.add(importedName)
        }
      }

      if (source === serverSource && importedName === 't') {
        bindings.directServerT.set(specifier.local.name, {
          local: specifier.local.name,
          source,
          declaration: entry,
          kind: 'server',
        })
      }

      if (options.rerouteServerAuthoringImports && source === frameworkSource && SERVER_AUTHORING_EXPORTS.has(importedName)) {
        frameworkServerSymbols.add(importedName)
      }

      if (options.rerouteServerAuthoringImports && source === serverSource && (SERVER_AUTHORING_EXPORTS.has(importedName) || importedName === 't')) {
        generatedServerSymbols.add(importedName)
      }
    }
  }

  if (options.rerouteServerAuthoringImports) {
    const duplicates = [...frameworkServerSymbols].filter(name => generatedServerSymbols.has(name))
    if (duplicates.length > 0) {
      throw new Error(
        `[fluenti] Do not import the same server authoring symbol from both '${frameworkSource}' and '${serverSource}' in one file. ` +
          `Conflicting imports: ${duplicates.join(', ')}.`,
      )
    }
  }

  return bindings
}

function collectTrackedTBindings(
  ast: SourceNode,
  importBindings: ImportBindings,
): Set<string> {
  const tBindings = new Set<string>()

  walkAllNodes(ast, (node) => {
    if (!isVariableDeclarator(node)) return
    if (!isTrackedTDeclarator(node, importBindings)) return

    for (const name of extractTBindingNames(node.id)) {
      tBindings.add(name)
    }
  })

  return tBindings
}

function walkAllNodes(
  node: unknown,
  visitor: (node: SourceNode) => void,
): void {
  if (!isSourceNode(node)) return

  visitor(node)

  for (const [key, value] of Object.entries(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue

    if (Array.isArray(value)) {
      for (const child of value) {
        walkAllNodes(child, visitor)
      }
      continue
    }

    walkAllNodes(value, visitor)
  }
}

function collectBlockBindings(
  node: SourceNode,
  scope: Scope,
  importBindings: ImportBindings,
): void {
  const body = Array.isArray(node['body']) ? node['body'] : []
  for (const statement of body) {
    if (!isSourceNode(statement)) continue

    if (statement.type === 'VariableDeclaration') {
      const declarations = Array.isArray(statement['declarations']) ? statement['declarations'] : []
      for (const declaration of declarations) {
        if (!isVariableDeclarator(declaration)) continue
        if (isTrackedTDeclarator(declaration, importBindings)) continue
        collectPatternNames(declaration.id, scope)
      }
      continue
    }

    if ((statement.type === 'FunctionDeclaration' || statement.type === 'ClassDeclaration') && isIdentifier(statement['id'])) {
      scope.bindings.add(statement['id'].name)
    }
  }
}

function collectFunctionBindings(
  node: SourceNode,
  scope: Scope,
  importBindings: ImportBindings,
): void {
  const params = Array.isArray(node['params']) ? node['params'] : []
  for (const param of params) {
    if (isSourceNode(param)) {
      collectPatternNames(param, scope)
    }
  }

  if (isSourceNode(node['body']) && node['body'].type === 'BlockStatement') {
    collectBlockBindings(node['body'], scope, importBindings)
  }
}

function collectPatternNames(pattern: SourceNode, scope: Scope): void {
  switch (pattern.type) {
    case 'Identifier':
      scope.bindings.add((pattern as IdentifierNode).name)
      return

    case 'ObjectPattern':
      for (const property of (pattern as ObjectPatternNode).properties) {
        if (property.type === 'RestElement') {
          collectPatternNames((property as RestElementNode).argument, scope)
          continue
        }

        if (property.type === 'ObjectProperty') {
          collectPatternNames((property as ObjectPropertyNode).value, scope)
        }
      }
      return

    case 'ArrayPattern':
      for (const element of (pattern as ArrayPatternNode).elements) {
        if (element) collectPatternNames(element, scope)
      }
      return

    case 'RestElement':
      collectPatternNames((pattern as RestElementNode).argument, scope)
      return

    case 'AssignmentPattern':
      collectPatternNames((pattern as AssignmentPatternNode).left, scope)
  }
}

function isTrackedTDeclarator(
  declarator: VariableDeclaratorNode,
  importBindings: ImportBindings,
): boolean {
  if (declarator.id.type !== 'ObjectPattern' || !declarator.init) {
    return false
  }

  if (isCallExpression(declarator.init) && isIdentifier(declarator.init.callee)) {
    return importBindings.useI18n.has(declarator.init.callee.name)
  }

  if (declarator.init.type === 'AwaitExpression') {
    const awaited = declarator.init as AwaitExpressionNode
    return isCallExpression(awaited.argument)
      && isIdentifier(awaited.argument.callee)
      && importBindings.getI18n.has(awaited.argument.callee.name)
  }

  return false
}

function extractTBindingNames(pattern: SourceNode): string[] {
  if (pattern.type !== 'ObjectPattern') return []

  const bindings: string[] = []
  for (const property of (pattern as ObjectPatternNode).properties) {
    if (property.type !== 'ObjectProperty') continue

    const objectProperty = property as ObjectPropertyNode
    if (objectProperty.computed || !isIdentifier(objectProperty.key) || objectProperty.key.name !== 't') {
      continue
    }

    if (isIdentifier(objectProperty.value)) {
      bindings.push(objectProperty.value.name)
      continue
    }

    if (objectProperty.value.type === 'AssignmentPattern' && isIdentifier((objectProperty.value as AssignmentPatternNode).left)) {
      bindings.push(((objectProperty.value as AssignmentPatternNode).left as IdentifierNode).name)
    }
  }

  return bindings
}

function createTargetContext(
  node: ProgramNode | FunctionLikeNode,
  scope: Scope,
  clientEligible: boolean,
  serverEligible: boolean,
): TargetContext {
  return {
    node,
    scope,
    clientEligible,
    serverEligible,
    helperNames: {},
    needsHelper: new Set<'client' | 'server'>(),
  }
}

function createFunctionTarget(
  node: FunctionLikeNode,
  parent: SourceNode | null,
  scope: Scope,
  options: ScopeTransformOptions,
): TargetContext | null {
  const name = resolveFunctionName(node, parent)
  const clientEligible = options.framework === 'vue'
    ? name === 'setup' || isHookName(name)
    : isComponentName(name) || isHookName(name)
  const serverEligible = node.async === true

  if (!clientEligible && !serverEligible) {
    return null
  }

  return createTargetContext(node, scope, clientEligible, serverEligible)
}

function resolveFunctionName(
  node: FunctionLikeNode,
  parent: SourceNode | null,
): string | null {
  if (isIdentifier(node.id)) {
    return node.id.name
  }

  if (parent?.type === 'VariableDeclarator' && isIdentifier(parent['id'])) {
    return parent['id'].name
  }

  if (parent?.type === 'ObjectProperty' && isIdentifier(parent['key'])) {
    return parent['key'].name
  }

  if ((node.type === 'ObjectMethod' || node.type === 'ClassMethod') && isIdentifier(node['key'])) {
    return node['key'].name
  }

  return null
}

function isComponentName(name: string | null): boolean {
  return !!name && /^[A-Z]/.test(name)
}

function isHookName(name: string | null): boolean {
  return !!name && /^use[A-Z0-9_]/.test(name)
}

function resolveDirectBinding(
  name: string,
  scope: Scope,
  importBindings: ImportBindings,
): DirectImportBinding | undefined {
  if (isShadowed(scope, name)) {
    return undefined
  }

  return importBindings.directClientT.get(name) ?? importBindings.directServerT.get(name)
}

function resolveTargetForBinding(
  activeTargets: TargetContext[],
  kind: 'client' | 'server',
): TargetContext | undefined {
  for (let index = activeTargets.length - 1; index >= 0; index--) {
    const target = activeTargets[index]!
    if (kind === 'client' && target.clientEligible) {
      return target
    }
    if (kind === 'server' && target.serverEligible) {
      return target
    }
  }

  return undefined
}

function ensureTargetHelper(
  target: TargetContext,
  kind: 'client' | 'server',
): string {
  const existing = target.helperNames[kind]
  if (existing) {
    target.needsHelper.add(kind)
    return existing
  }

  const helperName = createUniqueName(
    kind === 'server' ? '__fluenti_get_i18n' : '__fluenti_t',
    target.scope.bindings,
  )
  target.helperNames[kind] = helperName
  target.needsHelper.add(kind)
  target.scope.bindings.add(helperName)
  return helperName
}

function buildRuntimeTaggedTemplateCall(
  code: string,
  expression: TaggedTemplateExpressionNode,
  calleeName: string,
): SourceNode {
  const parts = extractTemplateTranslationParts(code, expression)
  const descriptorProperties: SourceNode[] = [
    objectProperty(identifier('id'), stringLiteral(createMessageId(parts.message))),
    objectProperty(identifier('message'), stringLiteral(parts.message)),
  ]

  const args: SourceNode[] = [objectExpression(descriptorProperties)]
  if (parts.values.length > 0) {
    args.push(objectExpression(parts.values))
  }

  return callExpression(identifier(calleeName), args, expression)
}

function buildImportedTaggedTemplateCall(
  code: string,
  expression: TaggedTemplateExpressionNode,
  helperName: string,
): SourceNode {
  const parts = extractTemplateTranslationParts(code, expression)
  const descriptorProperties: SourceNode[] = [
    objectProperty(identifier('id'), stringLiteral(createMessageId(parts.message))),
    objectProperty(identifier('message'), stringLiteral(parts.message)),
  ]

  const args: SourceNode[] = [objectExpression(descriptorProperties)]
  if (parts.values.length > 0) {
    args.push(objectExpression(parts.values))
  }

  return callExpression(identifier(helperName), args, expression)
}

function buildImportedDescriptorCall(
  call: CallExpressionNode,
  helperName: string,
): SourceNode {
  if (call.arguments.length === 0) {
    throw new Error(
      '[fluenti] Imported `t` only supports tagged templates and static descriptor calls. ' +
        'Use useI18n().t(...) or await getI18n() for runtime lookups.',
    )
  }

  const descriptor = extractStaticDescriptor(call.arguments[0]!)
  if (!descriptor) {
    throw new Error(
      '[fluenti] Imported `t` only supports tagged templates and static descriptor calls. ' +
        'Use useI18n().t(...) or await getI18n() for runtime lookups.',
    )
  }

  const runtimeDescriptor = [
    objectProperty(identifier('id'), stringLiteral(descriptor.id ?? createMessageId(descriptor.message, descriptor.context))),
    objectProperty(identifier('message'), stringLiteral(descriptor.message)),
  ]
  if (descriptor.context !== undefined) {
    runtimeDescriptor.push(objectProperty(identifier('context'), stringLiteral(descriptor.context)))
  }

  const args: SourceNode[] = [objectExpression(runtimeDescriptor)]
  if (call.arguments[1]) {
    args.push(call.arguments[1]!)
  }

  return callExpression(identifier(helperName), args, call)
}

function buildImportedServerTaggedTemplateCall(
  code: string,
  expression: TaggedTemplateExpressionNode,
  helperName: string,
): SourceNode {
  const parts = extractTemplateTranslationParts(code, expression)
  const descriptorProperties: SourceNode[] = [
    objectProperty(identifier('id'), stringLiteral(createMessageId(parts.message))),
    objectProperty(identifier('message'), stringLiteral(parts.message)),
  ]

  const args: SourceNode[] = [objectExpression(descriptorProperties)]
  if (parts.values.length > 0) {
    args.push(objectExpression(parts.values))
  }

  return callExpression(
    memberExpression(awaitExpression(callExpression(identifier(helperName), [])), identifier('t')),
    args,
    expression,
  )
}

function buildImportedServerDescriptorCall(
  call: CallExpressionNode,
  helperName: string,
): SourceNode {
  if (call.arguments.length === 0) {
    throw new Error(
      '[fluenti] Imported `t` only supports tagged templates and static descriptor calls. ' +
        'Use useI18n().t(...) or await getI18n() for runtime lookups.',
    )
  }

  const descriptor = extractStaticDescriptor(call.arguments[0]!)
  if (!descriptor) {
    throw new Error(
      '[fluenti] Imported `t` only supports tagged templates and static descriptor calls. ' +
        'Use useI18n().t(...) or await getI18n() for runtime lookups.',
    )
  }

  const runtimeDescriptor = [
    objectProperty(identifier('id'), stringLiteral(descriptor.id ?? createMessageId(descriptor.message, descriptor.context))),
    objectProperty(identifier('message'), stringLiteral(descriptor.message)),
  ]
  if (descriptor.context !== undefined) {
    runtimeDescriptor.push(objectProperty(identifier('context'), stringLiteral(descriptor.context)))
  }

  const args: SourceNode[] = [objectExpression(runtimeDescriptor)]
  if (call.arguments[1]) {
    args.push(call.arguments[1]!)
  }

  return callExpression(
    memberExpression(awaitExpression(callExpression(identifier(helperName), [])), identifier('t')),
    args,
    call,
  )
}

function extractTemplateTranslationParts(
  code: string,
  expression: TaggedTemplateExpressionNode,
): TemplateTranslationParts {
  let message = ''
  const values: SourceNode[] = []
  let positionalIndex = 0

  for (let index = 0; index < expression.quasi.quasis.length; index++) {
    const element = expression.quasi.quasis[index]!
    message += element.value.cooked ?? element.value.raw

    if (index >= expression.quasi.expressions.length) continue

    const exprNode = expression.quasi.expressions[index]!
    const exprSource = exprNode.start != null && exprNode.end != null
      ? code.slice(exprNode.start, exprNode.end)
      : ''
    const varName = classifyExpression(exprSource)

    if (varName === '') {
      message += `{${positionalIndex}}`
      values.push(objectProperty(numericLiteral(positionalIndex), exprNode))
      positionalIndex++
      continue
    }

    message += `{${varName}}`
    values.push(objectProperty(identifier(varName), exprNode))
  }

  return { message, values }
}

function extractStaticDescriptor(argument: SourceNode): StaticDescriptor | null {
  if (argument.type !== 'ObjectExpression') {
    return null
  }

  const staticParts: Partial<StaticDescriptor> = {}
  for (const property of (argument as ObjectExpressionNode).properties) {
    if (property.type !== 'ObjectProperty') continue

    const objectProperty = property as ObjectPropertyNode
    if (objectProperty.computed) return null

    const key = readPropertyKey(objectProperty.key)
    if (!key || !['id', 'message', 'context', 'comment'].includes(key)) continue

    const value = readStaticStringValue(objectProperty.value)
    if (value === undefined) return null

    if (key === 'comment') continue
    staticParts[key as keyof StaticDescriptor] = value
  }

  if (!staticParts.message) {
    return null
  }

  return staticParts as StaticDescriptor
}

function collectProgramBindingNames(program: ProgramNode): Set<string> {
  const names = new Set<string>()

  for (const statement of program.body) {
    if (statement.type === 'ImportDeclaration') {
      for (const specifier of (statement as ImportDeclarationNode).specifiers) {
        if (isSourceNode(specifier) && isIdentifier(specifier['local'])) {
          names.add(specifier['local'].name)
        }
      }
      continue
    }

    if (statement.type === 'VariableDeclaration') {
      for (const declaration of (statement as VariableDeclarationNode).declarations) {
        collectPatternBindingNames(declaration.id, names)
      }
      continue
    }

    if ((statement.type === 'FunctionDeclaration' || statement.type === 'ClassDeclaration') && isIdentifier(statement['id'])) {
      names.add(statement['id'].name)
    }
  }

  return names
}

function collectPatternBindingNames(pattern: SourceNode, names: Set<string>): void {
  switch (pattern.type) {
    case 'Identifier':
      names.add((pattern as IdentifierNode).name)
      return

    case 'ObjectPattern':
      for (const property of (pattern as ObjectPatternNode).properties) {
        if (property.type === 'RestElement') {
          collectPatternBindingNames((property as RestElementNode).argument, names)
          continue
        }
        if (property.type === 'ObjectProperty') {
          collectPatternBindingNames((property as ObjectPropertyNode).value, names)
        }
      }
      return

    case 'ArrayPattern':
      for (const element of (pattern as ArrayPatternNode).elements) {
        if (element) collectPatternBindingNames(element, names)
      }
      return

    case 'RestElement':
      collectPatternBindingNames((pattern as RestElementNode).argument, names)
      return

    case 'AssignmentPattern':
      collectPatternBindingNames((pattern as AssignmentPatternNode).left, names)
  }
}

function finalizeImports(
  program: ProgramNode,
  consumedDirectBindings: Set<string>,
  helperLocals: { client: string; server: string },
  needsClientImport: boolean,
  needsServerImport: boolean,
  options: ScopeTransformOptions,
): void {
  const frameworkSource = FLUENTI_PACKAGES[options.framework]
  const serverSource = options.serverModuleImport ?? '@fluenti/next/__generated'

  for (const statement of program.body) {
    if (!isImportDeclaration(statement)) continue

    const source = statement.source.value
    if (source !== frameworkSource && source !== serverSource) continue

    if (options.rerouteServerAuthoringImports && source === frameworkSource) {
      for (const specifier of statement.specifiers) {
        if (!isImportSpecifier(specifier)) continue
        const importedName = readImportedName(specifier)
        if (!importedName || !SERVER_AUTHORING_EXPORTS.has(importedName)) continue
        ensureNamedImport(program, serverSource, importedName, specifier.local.name)
      }
    }

    const nextSpecifiers = statement.specifiers.filter((specifier) => {
      if (!isImportSpecifier(specifier)) return true
      const importedName = readImportedName(specifier)
      if (options.rerouteServerAuthoringImports && source === frameworkSource && importedName && SERVER_AUTHORING_EXPORTS.has(importedName)) {
        return false
      }
      if (importedName !== 't') return true
      return !consumedDirectBindings.has(specifier.local.name)
    })

    statement.specifiers = nextSpecifiers
  }

  if (needsClientImport) {
    ensureNamedImport(program, frameworkSource, 'useI18n', helperLocals.client)
  }

  if (needsServerImport) {
    ensureNamedImport(program, serverSource, 'getI18n', helperLocals.server)
  }

  program.body = program.body.filter((statement) => {
    if (!isImportDeclaration(statement)) return true
    return statement.specifiers.length > 0
  })
}

function ensureNamedImport(
  program: ProgramNode,
  source: string,
  importedName: string,
  localName: string,
): void {
  const existing = program.body.find(
    (entry) => isImportDeclaration(entry) && entry.source.value === source,
  ) as ImportDeclarationNode | undefined

  if (existing) {
    const alreadyImported = existing.specifiers.some(
      (specifier) => isImportSpecifier(specifier) && readImportedName(specifier) === importedName,
    )
    if (!alreadyImported) {
      existing.specifiers.push(importSpecifier(importedName, localName))
    }
    return
  }

  const insertIndex = program.body.findIndex((entry) => entry.type !== 'ImportDeclaration')
  const declaration = importDeclaration(source, [importSpecifier(importedName, localName)])
  if (insertIndex === -1) {
    program.body.push(declaration)
    return
  }
  program.body.splice(insertIndex, 0, declaration)
}

function injectHelpers(
  program: ProgramNode,
  targets: Map<SourceNode, TargetContext>,
  helperLocals: { client: string; server: string },
): void {
  const orderedTargets = [...targets.values()]
  orderedTargets.sort((a, b) => (b.node.start ?? 0) - (a.node.start ?? 0))

  for (const target of orderedTargets) {
    const statements: SourceNode[] = []

    if (target.needsHelper.has('client')) {
      statements.push(buildHelperDeclaration(target.helperNames.client!, helperLocals.client, false))
    }

    if (target.needsHelper.has('server')) {
      statements.push(...buildServerHelperDeclarations(target, helperLocals.server))
    }

    if (statements.length === 0) continue

    if (target.node.type === 'Program') {
      const programNode = target.node as ProgramNode
      const insertIndex = programNode.body.findIndex((entry) => entry.type !== 'ImportDeclaration')
      if (insertIndex === -1) {
        programNode.body.push(...statements)
      } else {
        programNode.body.splice(insertIndex, 0, ...statements)
      }
      continue
    }

    const functionNode = target.node as FunctionLikeNode
    if (isSourceNode(functionNode.body) && functionNode.body.type === 'BlockStatement') {
      ;(functionNode.body as BlockStatementNode).body.unshift(...statements)
      continue
    }

    functionNode.body = blockStatement([
      ...statements,
      returnStatement(functionNode.body as SourceNode),
    ])
    functionNode.expression = false
  }

  if (program.body.length === 0) {
    program.body = []
  }
}

function buildHelperDeclaration(
  helperName: string,
  calleeName: string,
  awaitCallee: boolean,
): VariableDeclarationNode {
  const init = awaitCallee
    ? awaitExpression(callExpression(identifier(calleeName), []))
    : callExpression(identifier(calleeName), [])

  return variableDeclaration('const', [
    variableDeclarator(
      objectPattern([
        objectProperty(identifier('t'), identifier(helperName)),
      ]),
      init,
    ),
  ])
}

function buildServerHelperDeclarations(
  target: TargetContext,
  calleeName: string,
): SourceNode[] {
  const helperName = target.helperNames.server!
  const cacheName = createUniqueName(`${helperName}_cache`, target.scope.bindings)
  target.scope.bindings.add(cacheName)

  const helperProgram = parseSourceModule(`
let ${cacheName}
const ${helperName} = async () => {
  if (${cacheName} === undefined) {
    ${cacheName} = await ${calleeName}()
  }
  return ${cacheName}
}
`)

  if (!helperProgram || helperProgram.type !== 'Program') {
    throw new Error('[fluenti] Failed to build server helper for imported `t`.')
  }

  return [...(helperProgram['body'] as SourceNode[])]
}

function throwDirectImportScopeError(
  binding: DirectImportBinding,
  options: ScopeTransformOptions,
): never {
  if (binding.kind === 'server') {
    throw new Error(
      `[fluenti] Imported \`t\` from '${binding.source}' requires an async server scope. ` +
        'Make the current component/action/handler async, or use await getI18n().',
    )
  }

  const frameworkLabel = options.framework === 'vue'
    ? '<script setup> or setup()'
    : 'a component or custom hook'

  throw new Error(
    `[fluenti] Imported \`t\` from '${binding.source}' is a compile-time API. ` +
      `Use it only inside ${frameworkLabel}.`,
  )
}

function overwriteNode(target: SourceNode, replacement: SourceNode): void {
  for (const key of Object.keys(target)) {
    delete target[key]
  }
  Object.assign(target, replacement)
}

function isShadowed(scope: Scope, name: string): boolean {
  let current: Scope | null = scope
  while (current) {
    if (current.bindings.has(name)) {
      return true
    }
    current = current.parent
  }
  return false
}

function createUniqueName(base: string, names: Set<string>): string {
  if (!names.has(base)) {
    return base
  }

  let index = 2
  while (names.has(`${base}${index}`)) {
    index++
  }
  return `${base}${index}`
}

function readImportedName(specifier: ImportSpecifierNode): string | undefined {
  if (isIdentifier(specifier.imported)) {
    return specifier.imported.name
  }
  if (specifier.imported.type === 'StringLiteral') {
    return (specifier.imported as StringLiteralNode).value
  }
  return undefined
}

function readPropertyKey(node: SourceNode): string | undefined {
  if (isIdentifier(node)) {
    return node.name
  }
  if (node.type === 'StringLiteral') {
    return (node as StringLiteralNode).value
  }
  return undefined
}

function readStaticStringValue(node: SourceNode): string | undefined {
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

function identifier(name: string): IdentifierNode {
  return { type: 'Identifier', name }
}

function stringLiteral(value: string): StringLiteralNode {
  return { type: 'StringLiteral', value }
}

function numericLiteral(value: number): NumericLiteralNode {
  return { type: 'NumericLiteral', value }
}

function objectProperty(key: SourceNode, value: SourceNode): ObjectPropertyNode {
  return {
    type: 'ObjectProperty',
    key,
    value,
    computed: false,
    shorthand: false,
  }
}

function objectExpression(properties: SourceNode[]): ObjectExpressionNode {
  return {
    type: 'ObjectExpression',
    properties,
  }
}

function callExpression(callee: SourceNode, args: SourceNode[], original?: SourceNode): CallExpressionNode {
  return {
    type: 'CallExpression',
    callee,
    arguments: args,
    ...(original?.start != null ? { start: original.start } : {}),
    ...(original?.end != null ? { end: original.end } : {}),
    ...(original?.loc != null ? { loc: original.loc } : {}),
  }
}

function memberExpression(object: SourceNode, property: SourceNode): MemberExpressionNode {
  return {
    type: 'MemberExpression',
    object,
    property,
    computed: false,
  }
}

function awaitExpression(argument: SourceNode): AwaitExpressionNode {
  return {
    type: 'AwaitExpression',
    argument,
  }
}

function variableDeclarator(id: SourceNode, init: SourceNode): VariableDeclaratorNode {
  return {
    type: 'VariableDeclarator',
    id,
    init,
  }
}

function variableDeclaration(kind: 'const' | 'let' | 'var', declarations: VariableDeclaratorNode[]): VariableDeclarationNode {
  return {
    type: 'VariableDeclaration',
    kind,
    declarations,
  }
}

function objectPattern(properties: SourceNode[]): ObjectPatternNode {
  return {
    type: 'ObjectPattern',
    properties,
  }
}

function importSpecifier(importedName: string, localName: string): ImportSpecifierNode {
  return {
    type: 'ImportSpecifier',
    imported: identifier(importedName),
    local: identifier(localName),
  }
}

function importDeclaration(source: string, specifiers: SourceNode[]): ImportDeclarationNode {
  return {
    type: 'ImportDeclaration',
    source: stringLiteral(source),
    specifiers,
  }
}

function returnStatement(argument: SourceNode): ReturnStatementNode {
  return {
    type: 'ReturnStatement',
    argument,
  }
}

function blockStatement(body: SourceNode[]): BlockStatementNode {
  return {
    type: 'BlockStatement',
    body,
  }
}

function isImportDeclaration(node: unknown): node is ImportDeclarationNode {
  return isSourceNode(node) && node.type === 'ImportDeclaration'
}

function isImportSpecifier(node: unknown): node is ImportSpecifierNode {
  return isSourceNode(node) && node.type === 'ImportSpecifier'
}

function isVariableDeclarator(node: unknown): node is VariableDeclaratorNode {
  return isSourceNode(node) && node.type === 'VariableDeclarator'
}

function isCallExpression(node: unknown): node is CallExpressionNode {
  return isSourceNode(node) && node.type === 'CallExpression'
}

function isIdentifier(node: unknown): node is IdentifierNode {
  return isSourceNode(node) && node.type === 'Identifier'
}
