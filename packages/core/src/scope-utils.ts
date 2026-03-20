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
      `[fluenti] Imported \`t\` from '${binding.source}' must be used inside a React component, async function, or Next.js conventional export (e.g. generateMetadata).\n` +
        '  Hint: For utility files, pass `t` as a function parameter, or use `const { t } = await getI18n()` inside an async scope.\n' +
        '  Docs: https://fluenti.dev/frameworks/react/nextjs/',
    )
  }

  const frameworkLabel = options.framework === 'vue'
    ? '<script setup> or setup()'
    : 'a component or custom hook'

  throw new Error(
    `[fluenti] Imported \`t\` from '${binding.source}' is a compile-time API.\n` +
      `  It must be used inside ${frameworkLabel}.\n` +
      '  Hint: For utility files, accept `t` as a function parameter instead.\n' +
      '  Docs: https://fluenti.dev/api/' + (options.framework === 'vue' ? 'vue' : 'react') + '/',
  )
}
