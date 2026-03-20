import {
  identifier,
  objectProperty,
  objectPattern,
  variableDeclarator,
  variableDeclaration,
  callExpression,
  awaitExpression,
  importSpecifier,
  importDeclaration,
  returnStatement,
  blockStatement,
  isImportDeclaration,
  isImportSpecifier,
  type IdentifierNode,
  type ImportDeclarationNode,
  type BlockStatementNode,
  type VariableDeclarationNode,
} from './scope-ast-helpers'
import { isSourceNode, parseSourceModule, type SourceNode } from './source-analysis'
import { readImportedName } from './scope-read'
import { createUniqueName } from './scope-resolution'
import type {
  ProgramNode,
  FunctionLikeNode,
  TargetContext,
  ScopeTransformOptions,
} from './scope-types'
import {
  FLUENTI_PACKAGES,
  SERVER_AUTHORING_EXPORTS,
} from './scope-types'

export function finalizeImports(
  program: ProgramNode,
  consumedDirectBindings: Set<string>,
  helperLocals: { client: string; server: string },
  needsClientImport: boolean,
  needsServerImport: boolean,
  options: ScopeTransformOptions,
): void {
  const frameworkSource = FLUENTI_PACKAGES[options.framework] ?? `@fluenti/${options.framework}`
  const serverSource = options.serverModuleImport ?? '@fluenti/next'

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

export function ensureNamedImport(
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

export function injectHelpers(
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
      // Auto-promote sync RSC components to async
      const fn = target.node as FunctionLikeNode
      if (!fn.async) {
        fn.async = true
      }
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

      // Inject eager resolve statement before the first statement that uses it
      if (target.needsEagerResolve && target.eagerResolveName && target.helperNames.server) {
        injectEagerResolve(
          functionNode.body as BlockStatementNode,
          target.eagerResolveName,
          target.helperNames.server,
        )
      }
      continue
    }

    functionNode.body = blockStatement([
      ...statements,
      returnStatement(functionNode.body as SourceNode),
    ])
    functionNode.expression = false

    // Inject eager resolve for expression-body functions converted to block
    if (target.needsEagerResolve && target.eagerResolveName && target.helperNames.server) {
      injectEagerResolve(
        functionNode.body as BlockStatementNode,
        target.eagerResolveName,
        target.helperNames.server,
      )
    }
  }

  if (program.body.length === 0) {
    program.body = []
  }
}

export function injectEagerResolve(
  block: BlockStatementNode,
  eagerName: string,
  helperName: string,
): void {
  // Find the first statement in the block that contains a reference to eagerName
  const insertIndex = block.body.findIndex((stmt) => containsIdentifier(stmt, eagerName))
  if (insertIndex === -1) return

  const eagerStmt = variableDeclaration('const', [
    variableDeclarator(
      identifier(eagerName),
      awaitExpression(callExpression(identifier(helperName), [])),
    ),
  ])

  block.body.splice(insertIndex, 0, eagerStmt)
}

export function containsIdentifier(node: unknown, name: string): boolean {
  if (!isSourceNode(node)) return false
  if (node.type === 'Identifier' && (node as IdentifierNode).name === name) return true

  for (const [key, value] of Object.entries(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue
    if (Array.isArray(value)) {
      for (const child of value) {
        if (containsIdentifier(child, name)) return true
      }
    } else if (containsIdentifier(value, name)) {
      return true
    }
  }
  return false
}

export function buildHelperDeclaration(
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

export function buildServerHelperDeclarations(
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
