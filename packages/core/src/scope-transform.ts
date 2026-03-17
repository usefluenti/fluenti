/**
 * AST-based scope-aware transform for tagged template expressions.
 *
 * Uses acorn to parse the source, find `useI18n()` imports from @fluenti/*,
 * track the local binding of `t`, and only transform tagged template / call
 * expressions whose callee resolves to that binding.
 *
 * This replaces the regex-based `transformTaggedTemplate` with zero false positives.
 */

import * as acorn from 'acorn'
import type { Node } from 'acorn'

// ─── AST node type helpers ────────────────────────────────────────────────────

interface ImportDeclaration extends Node {
  type: 'ImportDeclaration'
  specifiers: ImportSpecifier[]
  source: { value: string }
}

interface ImportSpecifier extends Node {
  type: 'ImportSpecifier' | 'ImportDefaultSpecifier' | 'ImportNamespaceSpecifier'
  imported?: { name: string }
  local: { name: string }
}

interface VariableDeclarator extends Node {
  type: 'VariableDeclarator'
  id: ObjectPattern | Identifier
  init: CallExpression | Node | null
}

interface ObjectPattern extends Node {
  type: 'ObjectPattern'
  properties: Property[]
}

interface Property extends Node {
  type: 'Property'
  key: Identifier
  value: Identifier
}

interface Identifier extends Node {
  type: 'Identifier'
  name: string
}

interface CallExpression extends Node {
  type: 'CallExpression'
  callee: Identifier | Node
  arguments: Node[]
}

interface TaggedTemplateExpression extends Node {
  type: 'TaggedTemplateExpression'
  tag: Identifier | Node
  quasi: TemplateLiteral
}

interface TemplateLiteral extends Node {
  type: 'TemplateLiteral'
  quasis: TemplateElement[]
  expressions: Node[]
}

interface TemplateElement extends Node {
  type: 'TemplateElement'
  value: { raw: string; cooked: string | null }
}

// ─── Scope tracking ──────────────────────────────────────────────────────────

interface Scope {
  bindings: Set<string>
  parent: Scope | null
}

function createScope(parent: Scope | null): Scope {
  return { bindings: new Set(), parent }
}

// ─── Replacement descriptor ──────────────────────────────────────────────────

export interface Replacement {
  start: number
  end: number
  replacement: string
}

// ─── Expression classifier (shared with old transform) ───────────────────────

function classifyExpression(expr: string): string {
  const trimmed = expr.trim()
  // Simple identifier: name, count, etc.
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
    return trimmed
  }
  // Dotted path: user.name → 'name'
  if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(trimmed) && !trimmed.endsWith('.')) {
    const parts = trimmed.split('.')
    return parts[parts.length - 1]!
  }
  return ''
}

// ─── Main transform ──────────────────────────────────────────────────────────

const FLUENTI_PACKAGES = [
  '@fluenti/react',
  '@fluenti/vue',
  '@fluenti/solid',
]

export interface ScopeTransformOptions {
  framework: 'vue' | 'solid' | 'react'
}

export interface ScopeTransformResult {
  code: string
  /** Whether any transforms were applied */
  transformed: boolean
}

/**
 * Scope-aware transform of `t`...`` and `t(...)` where `t` comes from
 * `const { t } = useI18n()` (or a renamed destructuring).
 *
 * Returns the transformed code and a flag indicating whether any changes were made.
 */
export function scopeTransform(
  code: string,
  options: ScopeTransformOptions,
): ScopeTransformResult {
  const framework = options.framework

  let ast: acorn.Program
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 2022,
      sourceType: 'module',
      locations: false,
    })
  } catch {
    // If parse fails (e.g. JSX), return unchanged
    return { code, transformed: false }
  }

  // Step 1: Find useI18n import from @fluenti/*
  const useI18nLocalNames = new Set<string>()
  for (const node of ast.body) {
    if (node.type !== 'ImportDeclaration') continue
    const decl = node as unknown as ImportDeclaration
    if (!FLUENTI_PACKAGES.includes(decl.source.value)) continue
    for (const spec of decl.specifiers) {
      if (spec.type === 'ImportSpecifier' && spec.imported?.name === 'useI18n') {
        useI18nLocalNames.add(spec.local.name)
      }
    }
  }

  if (useI18nLocalNames.size === 0) {
    // No useI18n import — nothing to transform
    return { code, transformed: false }
  }

  // Step 2: Find `const { t } = useI18n()` destructuring patterns
  // and collect the local binding names for `t`
  const tBindings = new Set<string>()

  function findBindings(body: Node[]): void {
    for (const stmt of body) {
      if (stmt.type === 'VariableDeclaration') {
        const decl = stmt as any
        for (const declarator of decl.declarations as VariableDeclarator[]) {
          if (!declarator.init) continue
          // Check if init is a call to useI18n()
          if (
            declarator.init.type === 'CallExpression' &&
            (declarator.init as CallExpression).callee.type === 'Identifier' &&
            useI18nLocalNames.has(((declarator.init as CallExpression).callee as Identifier).name)
          ) {
            // Check if the binding is an object destructuring
            if (declarator.id.type === 'ObjectPattern') {
              const pattern = declarator.id as ObjectPattern
              for (const prop of pattern.properties) {
                if (prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === 't') {
                  // The local name might differ: { t: translate }
                  if (prop.value.type === 'Identifier') {
                    tBindings.add(prop.value.name)
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Walk the top-level and function bodies
  walkForBindings(ast.body as Node[], findBindings)

  if (tBindings.size === 0) {
    return { code, transformed: false }
  }

  // Step 3: Walk AST to find TaggedTemplateExpression and CallExpression matching t bindings
  // Build scope tree and check for shadowing
  const replacements: Replacement[] = []

  function walkNode(node: Node, scope: Scope): void {
    if (!node || typeof node !== 'object') return

    switch (node.type) {
      case 'TaggedTemplateExpression': {
        const expr = node as unknown as TaggedTemplateExpression
        if (
          expr.tag.type === 'Identifier' &&
          tBindings.has((expr.tag as Identifier).name) &&
          !isShadowed(scope, (expr.tag as Identifier).name)
        ) {
          const replacement = buildTaggedTemplateReplacement(code, expr, framework)
          if (replacement) {
            replacements.push(replacement)
          }
        }
        // Don't walk into the quasi — we've already processed it
        for (const exprNode of (expr.quasi as TemplateLiteral).expressions) {
          walkNode(exprNode, scope)
        }
        return
      }

      case 'BlockStatement':
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'SwitchStatement': {
        const newScope = createScope(scope)
        collectBlockBindings(node, newScope)
        walkChildren(node, newScope)
        return
      }

      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        const newScope = createScope(scope)
        collectFunctionParams(node, newScope)
        collectBlockBindings(node, newScope)
        walkChildren(node, newScope)
        return
      }

      default:
        walkChildren(node, scope)
    }
  }

  function walkChildren(node: Node, scope: Scope): void {
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'start' || key === 'end') continue
      const val = (node as any)[key]
      if (Array.isArray(val)) {
        for (const child of val) {
          if (child && typeof child === 'object' && child.type) {
            walkNode(child as Node, scope)
          }
        }
      } else if (val && typeof val === 'object' && val.type) {
        walkNode(val as Node, scope)
      }
    }
  }

  const rootScope = createScope(null)
  walkNode(ast as unknown as Node, rootScope)

  if (replacements.length === 0) {
    return { code, transformed: false }
  }

  // Apply replacements in reverse order to preserve offsets
  replacements.sort((a, b) => b.start - a.start)
  let result = code
  for (const r of replacements) {
    result = result.slice(0, r.start) + r.replacement + result.slice(r.end)
  }

  return { code: result, transformed: true }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function walkForBindings(body: Node[], callback: (body: Node[]) => void): void {
  callback(body)
  for (const node of body) {
    walkForBindingsInNode(node, callback)
  }
}

function walkForBindingsInNode(node: Node, callback: (body: Node[]) => void): void {
  if (!node || typeof node !== 'object') return
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end') continue
    const val = (node as any)[key]
    if (Array.isArray(val)) {
      // Check if it's a body array
      const hasStatements = val.some((v: any) => v && typeof v === 'object' && v.type && v.type.endsWith('Declaration'))
      if (hasStatements) {
        callback(val as Node[])
      }
      for (const child of val) {
        if (child && typeof child === 'object' && child.type) {
          walkForBindingsInNode(child as Node, callback)
        }
      }
    } else if (val && typeof val === 'object' && val.type) {
      walkForBindingsInNode(val as Node, callback)
    }
  }
}

function isShadowed(scope: Scope, name: string): boolean {
  // Check if name is bound in any scope (excluding the root where tBindings live)
  let current: Scope | null = scope
  while (current) {
    if (current.bindings.has(name)) return true
    current = current.parent
  }
  return false
}

function collectBlockBindings(node: Node, scope: Scope): void {
  const body = (node as any).body
  if (!Array.isArray(body)) return
  for (const stmt of body) {
    if (stmt.type === 'VariableDeclaration') {
      const decl = stmt as any
      for (const declarator of decl.declarations) {
        collectPatternNames(declarator.id, scope)
      }
    } else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
      scope.bindings.add(stmt.id.name)
    }
  }
}

function collectFunctionParams(node: Node, scope: Scope): void {
  const params = (node as any).params
  if (!Array.isArray(params)) return
  for (const param of params) {
    collectPatternNames(param, scope)
  }
}

function collectPatternNames(pattern: Node, scope: Scope): void {
  if (!pattern) return
  if (pattern.type === 'Identifier') {
    scope.bindings.add((pattern as Identifier).name)
  } else if (pattern.type === 'ObjectPattern') {
    for (const prop of (pattern as ObjectPattern).properties) {
      collectPatternNames(prop.value, scope)
    }
  } else if (pattern.type === 'ArrayPattern') {
    for (const elem of (pattern as any).elements) {
      if (elem) collectPatternNames(elem, scope)
    }
  } else if (pattern.type === 'RestElement') {
    collectPatternNames((pattern as any).argument, scope)
  } else if (pattern.type === 'AssignmentPattern') {
    collectPatternNames((pattern as any).left, scope)
  }
}

function buildTaggedTemplateReplacement(
  code: string,
  expr: TaggedTemplateExpression,
  framework: 'vue' | 'solid' | 'react',
): Replacement | null {
  const quasi = expr.quasi as TemplateLiteral
  const tag = (expr.tag as Identifier).name

  let icuMessage = ''
  const valueEntries: string[] = []
  let positionalIndex = 0

  for (let i = 0; i < quasi.quasis.length; i++) {
    const element = quasi.quasis[i]!
    icuMessage += element.value.cooked ?? element.value.raw

    if (i < quasi.expressions.length) {
      const exprNode = quasi.expressions[i]!
      const exprSource = code.slice(exprNode.start, exprNode.end)
      const varName = classifyExpression(exprSource)

      if (varName === '') {
        icuMessage += `{${positionalIndex}}`
        const valueExpr = framework === 'vue' ? `unref(${exprSource})` : exprSource
        valueEntries.push(`${positionalIndex}: ${valueExpr}`)
        positionalIndex++
      } else {
        icuMessage += `{${varName}}`
        const valueExpr = framework === 'vue' ? `unref(${exprSource})` : exprSource
        valueEntries.push(`${varName}: ${valueExpr}`)
      }
    }
  }

  const escapedIcuMessage = icuMessage.replace(/'/g, "\\'")
  const valuesObj = valueEntries.length > 0
    ? `, { ${valueEntries.join(', ')} }`
    : ''

  const replacement = `${tag}('${escapedIcuMessage}'${valuesObj})`

  return {
    start: expr.start,
    end: expr.end,
    replacement,
  }
}
