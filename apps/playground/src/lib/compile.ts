/**
 * Browser-safe catalog compilation.
 * Mirrors @fluenti/cli compile logic — generates JS module code from catalog.
 */

import { parse } from '@fluenti/core'
import type { ASTNode, PluralNode, SelectNode } from '@fluenti/core'
import { hashMessage } from './hash'
import type { CatalogData } from './catalog'

const ICU_VAR_REGEX = /\{(\w+)\}/g
const ICU_PLURAL_SELECT_REGEX = /\{(\w+),\s*(plural|select|selectordinal)\s*,/

function hasVariables(message: string): boolean {
  return ICU_VAR_REGEX.test(message)
}

function escapeStringLiteral(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}

function escapeTemplateLiteral(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}

function messageToTemplateString(message: string): string {
  return message.replace(ICU_VAR_REGEX, (_match, name: string) => `\${v.${name}}`)
}

// ─── ICU AST → JS code generation ──────────────────────────────────────────

function astToJsExpression(nodes: ASTNode[], locale: string): string {
  if (nodes.length === 0) return "''"
  const parts = nodes.map((node) => astNodeToJs(node, locale))
  return parts.length === 1 ? parts[0]! : parts.join(' + ')
}

function astNodeToJs(node: ASTNode, locale: string): string {
  switch (node.type) {
    case 'text':
      return `'${escapeStringLiteral(node.value)}'`
    case 'variable':
      if (node.name === '#') return 'String(__c)'
      return `String(v.${node.name} ?? '{${node.name}}')`
    case 'plural':
      return pluralToJs(node as PluralNode, locale)
    case 'select':
      return selectToJs(node as SelectNode, locale)
    case 'function':
      return `String(v.${node.variable} ?? '')`
  }
}

function pluralToJs(node: PluralNode, locale: string): string {
  const offset = node.offset ?? 0
  const countExpr = offset ? `(v.${node.variable} - ${offset})` : `v.${node.variable}`
  const lines: string[] = []
  lines.push(`((c) => { const __c = c; `)

  const exactKeys = Object.keys(node.options).filter((k) => k.startsWith('='))
  for (const key of exactKeys) {
    const num = key.slice(1)
    const body = astToJsExpression(node.options[key]!, locale)
    lines.push(`if (c === ${num}) return ${body}; `)
  }

  const cldrKeys = Object.keys(node.options).filter((k) => !k.startsWith('='))
  if (cldrKeys.length > 1 || (cldrKeys.length === 1 && cldrKeys[0] !== 'other')) {
    lines.push(`const __cat = new Intl.PluralRules('${locale}').select(c); `)
    for (const key of cldrKeys) {
      if (key === 'other') continue
      const body = astToJsExpression(node.options[key]!, locale)
      lines.push(`if (__cat === '${key}') return ${body}; `)
    }
  }

  const otherBody = node.options['other']
    ? astToJsExpression(node.options['other'], locale)
    : "''"
  lines.push(`return ${otherBody}; `)
  lines.push(`})(${countExpr})`)
  return lines.join('')
}

function selectToJs(node: SelectNode, locale: string): string {
  const lines: string[] = []
  lines.push(`((s) => { `)
  const keys = Object.keys(node.options).filter((k) => k !== 'other')
  for (const key of keys) {
    const body = astToJsExpression(node.options[key]!, locale)
    lines.push(`if (s === '${escapeStringLiteral(key)}') return ${body}; `)
  }
  const otherBody = node.options['other']
    ? astToJsExpression(node.options['other'], locale)
    : "''"
  lines.push(`return ${otherBody}; `)
  lines.push(`})(String(v.${node.variable} ?? ''))`)
  return lines.join('')
}

// ─── Public: compile catalog to JS module ───────────────────────────────────

/** Compile catalog to tree-shakeable named exports with default re-export */
export function compileCatalog(catalog: CatalogData, locale: string): string {
  const lines: string[] = []
  const entries = Object.entries(catalog).filter(([, entry]) => !entry.obsolete)
  const exportNames: Array<{ id: string; exportName: string }> = []

  for (const [id, entry] of entries) {
    const hash = hashMessage(id)
    const exportName = `_${hash}`
    const translated = entry.translation ?? entry.message ?? id

    if (ICU_PLURAL_SELECT_REGEX.test(translated)) {
      try {
        const ast = parse(translated)
        const jsExpr = astToJsExpression(ast, locale)
        lines.push(`/* @__PURE__ */ export const ${exportName} = (v) => ${jsExpr}`)
      } catch {
        lines.push(`/* @__PURE__ */ export const ${exportName} = '${escapeStringLiteral(translated)}'`)
      }
    } else if (hasVariables(translated)) {
      const templateStr = messageToTemplateString(escapeTemplateLiteral(translated))
      lines.push(`/* @__PURE__ */ export const ${exportName} = (v) => \`${templateStr}\``)
    } else {
      lines.push(`/* @__PURE__ */ export const ${exportName} = '${escapeStringLiteral(translated)}'`)
    }

    exportNames.push({ id, exportName })
  }

  if (lines.length === 0) return '// empty catalog\nexport default {}\n'

  lines.push('')
  lines.push('export default {')
  for (const { id, exportName } of exportNames) {
    lines.push(`  '${escapeStringLiteral(id)}': ${exportName},`)
  }
  lines.push('}')
  lines.push('')

  return lines.join('\n')
}
