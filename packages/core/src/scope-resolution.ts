import type {
  Scope,
  ImportBindings,
  DirectImportBinding,
  TargetContext,
} from './scope-types'

export function resolveDirectBinding(
  name: string,
  scope: Scope,
  importBindings: ImportBindings,
): DirectImportBinding | undefined {
  if (isShadowed(scope, name)) {
    return undefined
  }

  return importBindings.directClientT.get(name) ?? importBindings.directServerT.get(name)
}

export function resolveTargetForBinding(
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

export function ensureTargetHelper(
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

export function isShadowed(scope: Scope, name: string): boolean {
  let current: Scope | null = scope
  while (current) {
    if (current.bindings.has(name)) {
      return true
    }
    current = current.parent
  }
  return false
}

export function createUniqueName(base: string, names: Set<string>): string {
  if (!names.has(base)) {
    return base
  }

  let index = 2
  while (names.has(`${base}${index}`)) {
    index++
  }
  return `${base}${index}`
}
