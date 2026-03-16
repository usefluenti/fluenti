/**
 * Compile-time transforms for React/Next.js.
 *
 * Ported from @fluenti/vite-plugin — React-only subset:
 * - t`tagged template` → __i18n.t('message', { vars })
 * - t('string call')   → __i18n.t('message', { vars })
 * - Auto-injects `import { __useI18n } from '@fluenti/react'`
 */

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

export function transformTaggedTemplate(code: string): { code: string; needsImport: boolean } {
  let result = code
  let needsImport = false

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

// ─── Import injection ───────────────────────────────────────────────────────

export function injectImport(code: string): string {
  const importLine = `import { __useI18n } from '@fluenti/react';\nconst __i18n = __useI18n();\n`
  return importLine + code
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
  // Quick check: does the file contain t` or t( patterns?
  if (!/\bt[`(]/.test(code)) return null

  const result = transformTaggedTemplate(code)
  if (!result.needsImport) return null

  const finalCode = injectImport(result.code)
  return { code: finalCode, transformed: true }
}
