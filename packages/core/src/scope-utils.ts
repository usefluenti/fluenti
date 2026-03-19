import { createRequire } from 'node:module'
import type { SourceNode } from './source-analysis'
import type { DirectImportBinding, ScopeTransformOptions } from './scope-types'

export function classifyExpression(expr: string): string {
  const trimmed = expr.trim()
  // Simple identifier: name, count
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
    return trimmed
  }
  // Dotted path: user.name → name
  if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(trimmed) && !trimmed.endsWith('.')) {
    const parts = trimmed.split('.')
    return parts[parts.length - 1]!
  }
  // Function call: fun() → fun, obj.method() → obj_method
  const callMatch = trimmed.match(/^([a-zA-Z_$][a-zA-Z0-9_$.]*)\s*\(/)
  if (callMatch) {
    return callMatch[1]!.replace(/\./g, '_')
  }
  return ''
}

const require = createRequire(
  typeof __filename !== 'undefined' ? __filename : import.meta.url,
)
let generateCode:
  | ((ast: unknown, options?: unknown) => { code: string })
  | null = null

export function getGenerateCode(): (ast: unknown, options?: unknown) => { code: string } {
  if (generateCode) return generateCode

  const generatorModule = require('@babel/generator') as {
    default?: (ast: unknown, options?: unknown) => { code: string }
  }

  generateCode = typeof generatorModule.default === 'function'
    ? generatorModule.default
    : (generatorModule as unknown as (ast: unknown, options?: unknown) => { code: string })

  return generateCode
}

export function overwriteNode(target: SourceNode, replacement: SourceNode): void {
  for (const key of Object.keys(target)) {
    delete target[key]
  }
  Object.assign(target, replacement)
}

export function throwDirectImportScopeError(
  binding: DirectImportBinding,
  options: ScopeTransformOptions,
): never {
  if (binding.kind === 'server') {
    throw new Error(
      `[fluenti] Imported \`t\` from '${binding.source}' must be used inside a React component or async function.\n` +
        '  Hint: For utility files, pass `t` as a function parameter, or use `const { t } = await getI18n()` inside an async scope.',
    )
  }

  const frameworkLabel = options.framework === 'vue'
    ? '<script setup> or setup()'
    : 'a component or custom hook'

  throw new Error(
    `[fluenti] Imported \`t\` from '${binding.source}' is a compile-time API.\n` +
      `  It must be used inside ${frameworkLabel}.\n` +
      '  Hint: For utility files, accept `t` as a function parameter instead.',
  )
}
