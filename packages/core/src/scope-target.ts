import { isIdentifier } from './scope-ast-helpers'
import type { SourceNode } from './source-analysis'
import type {
  Scope,
  ProgramNode,
  FunctionLikeNode,
  TargetContext,
  ScopeTransformOptions,
} from './scope-types'

export function createTargetContext(
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
    needsEagerResolve: false,
  }
}

export function createFunctionTarget(
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
    || (options.treatFrameworkDirectImportsAsServer === true && isComponentName(name))

  if (!clientEligible && !serverEligible) {
    return null
  }

  return createTargetContext(node, scope, clientEligible, serverEligible)
}

export function resolveFunctionName(
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

export function isComponentName(name: string | null): boolean {
  return !!name && /^[A-Z]/.test(name)
}

export function isHookName(name: string | null): boolean {
  return !!name && /^use[A-Z0-9_]/.test(name)
}
