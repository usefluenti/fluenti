/**
 * Tagged template and t() transform for webpack loader.
 *
 * Ported from @fluenti/vite-plugin transformTaggedTemplate,
 * adapted for Next.js (server vs client injection).
 */

export interface TransformResult {
  code: string
  needsImport: boolean
}

/**
 * Transform `t`...`` tagged templates and standalone `t()` calls
 * into `__i18n.t()` calls.
 */
export function transformTaggedTemplate(code: string): TransformResult {
  let result = code
  let needsImport = false

  // Match t`...` tagged template literals
  const taggedRegex = /\bt`((?:[^`\\]|\\.|(\$\{(?:[^}]|\{[^}]*\})*\}))*)`/g
  let match: RegExpExecArray | null

  while ((match = taggedRegex.exec(code)) !== null) {
    needsImport = true
    const fullMatch = match[0]
    const content = match[1]!

    const expressions: string[] = []
    const strings: string[] = []
    let current = ''
    let i = 0

    while (i < content.length) {
      if (content[i] === '\\' && i + 1 < content.length) {
        current += content[i]! + content[i + 1]!
        i += 2
      } else if (content[i] === '$' && content[i + 1] === '{') {
        strings.push(current)
        current = ''
        i += 2
        let depth = 1
        let expr = ''
        while (i < content.length && depth > 0) {
          if (content[i] === '{') depth++
          else if (content[i] === '}') {
            depth--
            if (depth === 0) break
          }
          expr += content[i]
          i++
        }
        expressions.push(expr)
        i++ // skip closing }
      } else {
        current += content[i]
        i++
      }
    }
    strings.push(current)

    let icuMessage = ''
    const valueEntries: string[] = []
    let positionalIndex = 0

    for (let j = 0; j < strings.length; j++) {
      icuMessage += strings[j]!
      if (j < expressions.length) {
        const expr = expressions[j]!.trim()
        const varName = classifyExpression(expr)

        if (varName === '') {
          icuMessage += `{${positionalIndex}}`
          valueEntries.push(`${positionalIndex}: ${expr}`)
          positionalIndex++
        } else {
          icuMessage += `{${varName}}`
          valueEntries.push(`${varName}: ${expr}`)
        }
      }
    }

    const valuesObj = valueEntries.length > 0
      ? `, { ${valueEntries.join(', ')} }`
      : ''

    // React: direct call (no reactive wrapper needed)
    const replacement = `__i18n.t('${icuMessage}'${valuesObj})`
    result = result.replace(fullMatch, replacement)
  }

  // Match standalone t() calls but NOT .t() or $t()
  const funcRegex = /(?<![.\w$])t\(\s*(['"])((?:[^\\]|\\.)*?)\1\s*(?:,\s*([^)]+))?\)/g

  const funcReplacements: Array<{ start: number; end: number; replacement: string }> = []
  while ((match = funcRegex.exec(result)) !== null) {
    needsImport = true
    const message = match[2]!
    const values = match[3]?.trim()

    const replacement = values
      ? `__i18n.t('${message}', ${values})`
      : `__i18n.t('${message}')`

    funcReplacements.push({ start: match.index, end: match.index + match[0].length, replacement })
  }

  // Apply replacements in reverse order to preserve offsets
  for (let i = funcReplacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = funcReplacements[i]!
    result = result.slice(0, start) + replacement + result.slice(end)
  }

  return { code: result, needsImport }
}

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
  // Complex expression: positional
  return ''
}

/**
 * Detect injection mode for a given file.
 */
export type InjectionMode = 'server' | 'client'

export function detectInjectionMode(
  code: string,
  resourcePath: string,
): InjectionMode {
  // 'use client' → always client
  if (/^['"]use client['"]/.test(code.trimStart())) {
    return 'client'
  }

  // 'use server' → always server
  if (/^['"]use server['"]/.test(code.trimStart())) {
    return 'server'
  }

  // Inside app/ directory → server (RSC default)
  if (isAppDirectory(resourcePath)) {
    return 'server'
  }

  // Inside pages/ directory → client (Pages Router)
  if (isPagesDirectory(resourcePath)) {
    return 'client'
  }

  // Default: client (shared components, libs)
  return 'client'
}

function isAppDirectory(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/')
  return /\/(app|src\/app)\//.test(normalized)
}

function isPagesDirectory(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/')
  return /\/(pages|src\/pages)\//.test(normalized)
}

/**
 * Inject the appropriate import statement based on injection mode.
 *
 * Ensures injected code is placed AFTER any 'use client' / 'use server'
 * directive, since Next.js / React requires those directives to appear
 * first in the module.
 */
export function injectI18nImport(
  code: string,
  mode: InjectionMode,
  serverModulePath: string,
): string {
  // Server: defer __getServerI18n() to render time via Proxy (avoids module-level call before FluentProvider)
  // Client: read from globalThis.__fluenti_i18n (set by I18nProvider), no React import needed
  const injection = mode === 'server'
    ? `import { __getServerI18n as __getI18nAccessor } from '${serverModulePath}';\nconst __i18n = new Proxy({}, { get: (_, p) => __getI18nAccessor()[p] });`
    : `const __i18n = new Proxy({}, { get: (_, p) => globalThis.__fluenti_i18n[p] });`

  // Find 'use client' or 'use server' directive and inject after it
  const directiveMatch = code.match(/^(\s*['"]use (?:client|server)['"];?\s*\n?)/)
  if (directiveMatch) {
    const directive = directiveMatch[0]
    return directive + injection + '\n' + code.slice(directive.length)
  }

  return injection + '\n' + code
}
