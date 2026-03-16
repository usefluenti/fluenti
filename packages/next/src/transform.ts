/**
 * Compile-time transforms for React/Next.js.
 *
 * Ported from @fluenti/vite-plugin — React-only subset:
 * - t`tagged template` → compiled t() call
 * - t('string call')   → compiled t() call
 * - `<Trans>`, `<Plural>`, `<DateTime>`, `<NumberFormat>` in server files → auto-injected from singleton
 *
 * Two modes:
 * - **Client** (`'use client'`): `t`msg`` → `__i18n.t('msg')`, auto-injects `__useI18n` hook
 * - **Server** (default in App Router): `t`msg`` → `__getServerI18n().t('msg')`, auto-injects import;
 *   also rewrites `<Trans>` → `<__Trans>` etc. with auto-imported singleton components
 */

export type TransformMode = 'client' | 'server'

// ─── Expression classifier ──────────────────────────────────────────────────

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

// ─── t`` tagged template transform ──────────────────────────────────────────

/**
 * @param mode - 'client' uses `__i18n.t(...)`, 'server' uses `__getServerI18n().t(...)`
 */
export function transformTaggedTemplate(
  code: string,
  mode: TransformMode = 'client',
): { code: string; needsImport: boolean } {
  let result = code
  let needsImport = false

  const callPrefix = mode === 'server' ? '__getServerI18n().t' : '__i18n.t'

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
        i++
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

    const replacement = `${callPrefix}('${icuMessage}'${valuesObj})`
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
      ? `${callPrefix}('${message}', ${values})`
      : `${callPrefix}('${message}')`

    funcReplacements.push({ start: match.index, end: match.index + match[0].length, replacement })
  }

  // Apply replacements in reverse order to preserve offsets
  for (let i = funcReplacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = funcReplacements[i]!
    result = result.slice(0, start) + replacement + result.slice(end)
  }

  return { code: result, needsImport }
}

// ─── Server Component rewriting ──────────────────────────────────────────────

/** Components that can be auto-injected in server mode */
const SERVER_COMPONENTS = ['Trans', 'Plural', 'DateTime', 'NumberFormat'] as const

/**
 * Detect `<Trans`, `<Plural`, `<DateTime`, `<NumberFormat` JSX usage
 * and rewrite to `<__Trans`, `<__Plural`, etc.
 *
 * Only rewrites components that are NOT already imported by the user.
 */
export function rewriteServerComponents(
  code: string,
): { code: string; components: string[] } {
  const components: string[] = []

  let result = code
  for (const name of SERVER_COMPONENTS) {
    // Check if the component is used in JSX: <Trans or <Trans> or <Trans/> or </Trans>
    const jsxUsage = new RegExp(`</?${name}[\\s/>]`)
    if (!jsxUsage.test(result)) continue

    // Check if user already imports this component (skip if so)
    const importPattern = new RegExp(
      `import\\s+(?:.*\\{[^}]*\\b${name}\\b[^}]*\\}|${name})\\s+from\\s+['"]`,
    )
    if (importPattern.test(result)) continue

    // Rewrite: <Trans → <__Trans, </Trans → </__Trans
    const rewriteOpen = new RegExp(`<${name}(?=[\\s/>])`, 'g')
    const rewriteClose = new RegExp(`</${name}(?=[\\s>])`, 'g')
    result = result.replace(rewriteOpen, `<__${name}`)
    result = result.replace(rewriteClose, `</__${name}`)
    components.push(name)
  }

  return { code: result, components }
}

// ─── Import injection ───────────────────────────────────────────────────────

export function injectClientImport(code: string): string {
  const importLine = `import { __useI18n } from '@fluenti/react';\nconst __i18n = __useI18n();\n`
  return importLine + code
}

export function injectServerImport(code: string, components: string[] = []): string {
  const imports = ['__getServerI18n']
  for (const name of components) {
    imports.push(`__${name}`)
  }
  const importLine = `import { ${imports.join(', ')} } from '@fluenti/next/server';\n`
  return importLine + code
}

/** @deprecated Use `injectClientImport` instead */
export const injectImport = injectClientImport

// ─── Helpers ────────────────────────────────────────────────────────────────

function hasUseClientDirective(code: string): boolean {
  // Match 'use client' or "use client" at the start of the file
  // (possibly preceded by comments or whitespace)
  return /^(?:\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/\s*)*\s*['"]use client['"]/.test(code)
}

// ─── Full transform pipeline ────────────────────────────────────────────────

export interface TransformResult {
  code: string
  transformed: boolean
}

export function transform(code: string, id: string): TransformResult | null {
  // Skip non-JS/TS files and node_modules
  if (id.includes('node_modules')) return null
  if (!id.match(/\.(tsx|jsx|ts|js)(\?|$)/)) return null

  const isClient = hasUseClientDirective(code)
  const serverModule = process.env['__FLUENTI_SERVER_MODULE']

  // Determine transform mode:
  // - Files with 'use client' → always client mode
  // - Files without 'use client' + serverModule configured → server mode
  // - Files without 'use client' + no serverModule → client mode (legacy/fallback)
  const mode: TransformMode = !isClient && serverModule ? 'server' : 'client'

  // Quick check: does the file contain t`, t(, or server component patterns?
  const hasTaggedOrCall = /\bt[`(]/.test(code)
  const hasServerComponents = mode === 'server' && /<\/?(?:Trans|Plural|DateTime|NumberFormat)[\s/>]/.test(code)

  if (!hasTaggedOrCall && !hasServerComponents) return null

  // Transform t`` and t() calls
  const result = transformTaggedTemplate(code, mode)

  // In server mode, also rewrite <Trans> → <__Trans> etc.
  let serverComponents: string[] = []
  let transformedCode = result.code
  if (mode === 'server') {
    const componentResult = rewriteServerComponents(transformedCode)
    transformedCode = componentResult.code
    serverComponents = componentResult.components
  }

  if (!result.needsImport && serverComponents.length === 0) return null

  let finalCode: string
  if (mode === 'server') {
    // Only include __getServerI18n if t``/t() was used
    if (result.needsImport) {
      finalCode = injectServerImport(transformedCode, serverComponents)
    } else {
      // Only components, no t() — import just the components
      const imports = serverComponents.map(n => `__${n}`)
      finalCode = `import { ${imports.join(', ')} } from '@fluenti/next/server';\n` + transformedCode
    }
  } else {
    finalCode = injectClientImport(transformedCode)
  }

  return { code: finalCode, transformed: true }
}
