import {
  isImportDeclaration,
  isImportSpecifier,
  isVariableDeclarator,
  isCallExpression,
  isIdentifier,
  type IdentifierNode,
  type ObjectPatternNode,
  type ObjectPropertyNode,
  type VariableDeclaratorNode,
  type AwaitExpressionNode,
  type VariableDeclarationNode,
  type ImportDeclarationNode,
} from './scope-ast-helpers'
import { isSourceNode, type SourceNode } from './source-analysis'
import { readImportedName } from './scope-read'
import type {
  Scope,
  ProgramNode,
  AssignmentPatternNode,
  ArrayPatternNode,
  RestElementNode,
  ImportBindings,
  ScopeTransformOptions,
  FLUENTI_PACKAGES,
} from './scope-types'
import {
  NEXT_I18N_MODULES,
  SERVER_AUTHORING_EXPORTS,
} from './scope-types'

export function collectImportBindings(
  ast: ProgramNode,
  options: ScopeTransformOptions,
  fluentiPackages: typeof FLUENTI_PACKAGES,
): ImportBindings {
  const bindings: ImportBindings = {
    useI18n: new Set<string>(),
    getI18n: new Set<string>(),
    directClientT: new Map(),
    directServerT: new Map(),
    frameworkImports: [],
    serverImports: [],
  }

  const frameworkSource = fluentiPackages[options.framework] ?? `@fluenti/${options.framework}`
  const serverSource = options.serverModuleImport ?? '@fluenti/next'
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

export function collectTrackedTBindings(
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

export function collectBlockBindings(
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

export function collectFunctionBindings(
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

export function collectPatternNames(pattern: SourceNode, scope: Scope): void {
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

export function collectProgramBindingNames(program: ProgramNode): Set<string> {
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

export function collectPatternBindingNames(pattern: SourceNode, names: Set<string>): void {
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
