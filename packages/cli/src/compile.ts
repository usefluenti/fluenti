import type { CatalogData } from './catalog'
import { hashMessage } from '@fluenti/core'
import { parse } from '@fluenti/core'
import type { ASTNode, PluralNode, SelectNode } from '@fluenti/core'

const ICU_VAR_REGEX = /\{(\w+)\}/g

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


// ─── ICU → JS code generation for split mode ───────────────────────────────

const ICU_PLURAL_SELECT_REGEX = /\{(\w+),\s*(plural|select|selectordinal)\s*,/

/** Check if message contains ICU plural/select syntax */
function hasIcuPluralOrSelect(message: string): boolean {
  return ICU_PLURAL_SELECT_REGEX.test(message)
}

/**
 * Compile an ICU AST node array into a JS expression string.
 * Used for generating static code (not runtime evaluation).
 */
function astToJsExpression(nodes: ASTNode[], locale: string): string {
  if (nodes.length === 0) return "''"

  const parts = nodes.map((node) => astNodeToJs(node, locale))

  if (parts.length === 1) return parts[0]!
  return parts.join(' + ')
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

  // Exact matches first
  const exactKeys = Object.keys(node.options).filter((k) => k.startsWith('='))
  if (exactKeys.length > 0) {
    for (const key of exactKeys) {
      const num = key.slice(1)
      const body = astToJsExpression(node.options[key]!, locale)
      lines.push(`if (c === ${num}) return ${body}; `)
    }
  }

  // CLDR categories via Intl.PluralRules
  const cldrKeys = Object.keys(node.options).filter((k) => !k.startsWith('='))
  if (cldrKeys.length > 1 || (cldrKeys.length === 1 && cldrKeys[0] !== 'other')) {
    lines.push(`const __cat = new Intl.PluralRules('${locale}').select(c); `)
    for (const key of cldrKeys) {
      if (key === 'other') continue
      const body = astToJsExpression(node.options[key]!, locale)
      lines.push(`if (__cat === '${key}') return ${body}; `)
    }
  }

  // Fallback to 'other'
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

/**
 * Compile a catalog to ES module with tree-shakeable named exports.
 * Each message becomes a `/* @__PURE__ *​/` annotated named export.
 * A default export maps message IDs to their compiled values for runtime lookup.
 */
/** Catalog format version. Bump when the compiled output format changes. */
export const CATALOG_VERSION = 1

export function compileCatalog(
  catalog: CatalogData,
  locale: string,
  allIds: string[],
  sourceLocale?: string,
): string {
  const lines: string[] = []
  lines.push(`// @fluenti/compiled v${CATALOG_VERSION}`)
  const exportNames: Array<{ id: string; exportName: string }> = []

  for (const id of allIds) {
    const hash = hashMessage(id)
    const exportName = `_${hash}`
    const entry = catalog[id]
    const translated = resolveCompiledMessage(entry, id, locale, sourceLocale)

    if (translated === undefined) {
      lines.push(`/* @__PURE__ */ export const ${exportName} = undefined`)
    } else if (hasIcuPluralOrSelect(translated)) {
      // Parse ICU and compile to JS
      const ast = parse(translated)
      const jsExpr = astToJsExpression(ast, locale)
      lines.push(`/* @__PURE__ */ export const ${exportName} = (v) => ${jsExpr}`)
    } else if (hasVariables(translated)) {
      const templateStr = messageToTemplateString(escapeTemplateLiteral(translated))
      lines.push(`/* @__PURE__ */ export const ${exportName} = (v) => \`${templateStr}\``)
    } else {
      lines.push(`/* @__PURE__ */ export const ${exportName} = '${escapeStringLiteral(translated)}'`)
    }

    exportNames.push({ id, exportName })
  }

  if (exportNames.length === 0) {
    return `// @fluenti/compiled v${CATALOG_VERSION}\n// empty catalog\nexport default {}\n`
  }

  // Default export maps message IDs → compiled values for runtime lookup
  lines.push('')
  lines.push('export default {')
  for (const { id, exportName } of exportNames) {
    lines.push(`  '${escapeStringLiteral(id)}': ${exportName},`)
  }
  lines.push('}')
  lines.push('')

  return lines.join('\n')
}

function resolveCompiledMessage(
  entry: CatalogData[string] | undefined,
  id: string,
  locale: string,
  sourceLocale: string | undefined,
): string | undefined {
  const effectiveSourceLocale = sourceLocale ?? locale

  if (!entry) {
    return undefined
  }

  if (entry.translation !== undefined && entry.translation.length > 0) {
    return entry.translation
  }

  if (locale === effectiveSourceLocale) {
    return entry.message ?? id
  }

  return undefined
}

/**
 * Generate the index module that exports locale list and lazy loaders.
 */
export function compileIndex(locales: string[], _catalogDir: string): string {
  const lines: string[] = []
  lines.push(`export const locales = ${JSON.stringify(locales)}`)
  lines.push('')
  lines.push('export const loaders = {')
  for (const locale of locales) {
    lines.push(`  '${escapeStringLiteral(locale)}': () => import('./${locale}.js'),`)
  }
  lines.push('}')
  lines.push('')
  return lines.join('\n')
}

/**
 * Collect the union of all message IDs across all locale catalogs.
 * Ensures every locale file exports the same names.
 */
export function collectAllIds(catalogs: Record<string, CatalogData>): string[] {
  const idSet = new Set<string>()
  for (const catalog of Object.values(catalogs)) {
    for (const [id, entry] of Object.entries(catalog)) {
      if (!entry.obsolete) {
        idSet.add(id)
      }
    }
  }
  return [...idSet].sort()
}
