import { isSourceNode, type SourceNode } from './source-analysis'
import { parseSourceModule } from './source-analysis'
import {
  isImportSpecifier,
  isIdentifier,
  type CallExpressionNode,
} from './scope-ast-helpers'

import {
  createScope,
  FLUENTI_PACKAGES,
  SERVER_AUTHORING_EXPORTS,
} from './scope-types'
import type {
  Scope,
  ProgramNode,
  FunctionLikeNode,
  TaggedTemplateExpressionNode,
  TargetContext,
  ScopeTransformOptions,
  ScopeTransformResult,
} from './scope-types'
export type { Replacement, ScopeTransformOptions, ScopeTransformResult } from './scope-types'

import {
  collectImportBindings,
  collectTrackedTBindings,
  collectBlockBindings,
  collectFunctionBindings,
  collectPatternNames,
  collectProgramBindingNames,
} from './scope-bindings'

import { readImportedName } from './scope-read'

import { createTargetContext, createFunctionTarget } from './scope-target'

import {
  resolveDirectBinding,
  resolveTargetForBinding,
  ensureTargetHelper,
  isShadowed,
  createUniqueName,
} from './scope-resolution'

import {
  buildRuntimeTaggedTemplateCall,
  buildImportedTaggedTemplateCall,
  buildImportedDescriptorCall,
  buildImportedServerTaggedTemplateCall,
  buildImportedServerDescriptorCall,
  buildSyncServerTaggedTemplateCall,
  buildSyncServerDescriptorCall,
} from './scope-builders'

import { overwriteNode, throwDirectImportScopeError, getGenerateCode } from './scope-utils'

import { finalizeImports, injectHelpers } from './scope-helpers'

export function scopeTransform(
  code: string,
  options: ScopeTransformOptions,
): ScopeTransformResult {
  const ast = parseSourceModule(code)
  if (!ast || ast.type !== 'Program') {
    return { code, transformed: false }
  }

  const program = ast as ProgramNode
  const importBindings = collectImportBindings(program, options, FLUENTI_PACKAGES)
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
    insideNonEligibleFn: boolean = false,
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

        walkChildren(node, nextScope, nextTargets, insideNonEligibleFn)
        return
      }

      case 'BlockStatement':
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'SwitchStatement': {
        const nextScope = createScope(scope)
        collectBlockBindings(node, nextScope, importBindings)
        walkChildren(node, nextScope, activeTargets, insideNonEligibleFn)
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

        // If no new target was created and we're already inside an eligible target,
        // mark as nested (inside a non-eligible function like .map() callback)
        const nextNested = target ? false : (insideNonEligibleFn || activeTargets.length > 0)

        walkChildren(node, nextScope, nextTargets, nextNested)
        return
      }

      case 'CatchClause': {
        const nextScope = createScope(scope)
        if (isSourceNode(node['param'])) {
          collectPatternNames(node['param'], nextScope)
        }
        walkChildren(node, nextScope, activeTargets, insideNonEligibleFn)
        return
      }

      case 'TaggedTemplateExpression': {
        const tagged = node as TaggedTemplateExpressionNode
        if (!isIdentifier(tagged.tag)) {
          walkChildren(node, scope, activeTargets, insideNonEligibleFn)
          return
        }

        const directBinding = resolveDirectBinding(tagged.tag.name, scope, importBindings)
        if (directBinding) {
          const target = resolveTargetForBinding(activeTargets, directBinding.kind)
          if (!target) {
            throwDirectImportScopeError(directBinding, options)
          }

          const helperName = ensureTargetHelper(target, directBinding.kind)

          let replacement: SourceNode
          if (directBinding.kind === 'server' && insideNonEligibleFn) {
            const eagerName = ensureEagerResolve(target)
            replacement = buildSyncServerTaggedTemplateCall(code, tagged, eagerName)
          } else if (directBinding.kind === 'server') {
            replacement = buildImportedServerTaggedTemplateCall(code, tagged, helperName)
          } else {
            replacement = buildImportedTaggedTemplateCall(code, tagged, helperName)
          }
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

        walkChildren(node, scope, activeTargets, insideNonEligibleFn)
        return
      }

      case 'CallExpression': {
        const call = node as CallExpressionNode
        if (!isIdentifier(call.callee)) {
          walkChildren(node, scope, activeTargets, insideNonEligibleFn)
          return
        }

        const directBinding = resolveDirectBinding(call.callee.name, scope, importBindings)
        if (!directBinding) {
          walkChildren(node, scope, activeTargets, insideNonEligibleFn)
          return
        }

        const target = resolveTargetForBinding(activeTargets, directBinding.kind)
        if (!target) {
          throwDirectImportScopeError(directBinding, options)
        }

        const helperName = ensureTargetHelper(target, directBinding.kind)

        let replacement: SourceNode
        if (directBinding.kind === 'server' && insideNonEligibleFn) {
          const eagerName = ensureEagerResolve(target)
          replacement = buildSyncServerDescriptorCall(call, eagerName)
        } else if (directBinding.kind === 'server') {
          replacement = buildImportedServerDescriptorCall(call, helperName)
        } else {
          replacement = buildImportedDescriptorCall(call, helperName)
        }
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
        walkChildren(node, scope, activeTargets, insideNonEligibleFn)
    }
  }

  function ensureEagerResolve(target: TargetContext): string {
    if (!target.eagerResolveName) {
      target.eagerResolveName = createUniqueName('__fluenti_i18n', target.scope.bindings)
      target.scope.bindings.add(target.eagerResolveName)
    }
    target.needsEagerResolve = true
    return target.eagerResolveName
  }

  function walkChildren(
    node: SourceNode,
    scope: Scope,
    activeTargets: TargetContext[],
    insideNonEligibleFn: boolean = false,
  ): void {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue

      if (Array.isArray(value)) {
        for (const child of value) {
          if (isSourceNode(child)) {
            walk(child, node, scope, activeTargets, insideNonEligibleFn)
          }
        }
        continue
      }

      if (isSourceNode(value)) {
        walk(value, node, scope, activeTargets, insideNonEligibleFn)
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
