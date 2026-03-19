import type { CatalogData } from './catalog'
import { hashMessage } from '@fluenti/core'
import { parse } from '@fluenti/core'
import type { ASTNode, PluralNode, SelectNode, VariableNode, FunctionNode } from '@fluenti/core'

const ICU_VAR_REGEX = /\{(\w+)\}/g
const ICU_VAR_TEST = /\{(\w+)\}/

function hasVariables(message: string): boolean {
  return ICU_VAR_TEST.test(message)
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
    lines.push(`const __cat = new Intl.PluralRules('${escapeStringLiteral(locale)}').select(c); `)
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

export interface CompileStats {
  compiled: number
  missing: string[]
}

export interface CompileOptions {
  skipFuzzy?: boolean
}

export function compileCatalog(
  catalog: CatalogData,
  locale: string,
  allIds: string[],
  sourceLocale?: string,
  options?: CompileOptions,
): { code: string; stats: CompileStats } {
  const lines: string[] = []
  lines.push(`// @fluenti/compiled v${CATALOG_VERSION}`)
  const exportNames: Array<{ id: string; exportName: string }> = []
  let compiled = 0
  const missing: string[] = []

  const hashToId = new Map<string, string>()

  for (const id of allIds) {
    const hash = hashMessage(id)

    const existingId = hashToId.get(hash)
    if (existingId !== undefined && existingId !== id) {
      throw new Error(
        `Hash collision detected: messages "${existingId}" and "${id}" produce the same hash "${hash}"`,
      )
    }
    hashToId.set(hash, id)

    const exportName = `_${hash}`
    const entry = catalog[id]
    const translated = resolveCompiledMessage(entry, id, locale, sourceLocale, options?.skipFuzzy)

    if (translated === undefined) {
      lines.push(`export const ${exportName} = undefined`)
      missing.push(id)
    } else if (hasIcuPluralOrSelect(translated)) {
      // Parse ICU and compile to JS
      const ast = parse(translated)
      const jsExpr = astToJsExpression(ast, locale)
      lines.push(`export const ${exportName} = (v) => ${jsExpr}`)
      compiled++
    } else if (hasVariables(translated)) {
      const templateStr = messageToTemplateString(escapeTemplateLiteral(translated))
      lines.push(`export const ${exportName} = (v) => \`${templateStr}\``)
      compiled++
    } else {
      lines.push(`export const ${exportName} = '${escapeStringLiteral(translated)}'`)
      compiled++
    }

    exportNames.push({ id, exportName })
  }

  if (exportNames.length === 0) {
    return {
      code: `// @fluenti/compiled v${CATALOG_VERSION}\n// empty catalog\nexport default {}\n`,
      stats: { compiled: 0, missing: [] },
    }
  }

  // Default export maps message IDs → compiled values for runtime lookup
  lines.push('')
  lines.push('export default {')
  for (const { id, exportName } of exportNames) {
    lines.push(`  '${escapeStringLiteral(id)}': ${exportName},`)
  }
  lines.push('}')
  lines.push('')

  return { code: lines.join('\n'), stats: { compiled, missing } }
}

function resolveCompiledMessage(
  entry: CatalogData[string] | undefined,
  id: string,
  locale: string,
  sourceLocale: string | undefined,
  skipFuzzy?: boolean,
): string | undefined {
  const effectiveSourceLocale = sourceLocale ?? locale

  if (!entry) {
    return undefined
  }

  if (skipFuzzy && entry.fuzzy) {
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
    lines.push(`  '${escapeStringLiteral(locale)}': () => import('./${escapeStringLiteral(locale)}.js'),`)
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

// ─── Type-safe message ID generation ─────────────────────────────────────────

export interface MessageVariable {
  name: string
  type: string
}

/**
 * Extract variable names and their TypeScript types from an ICU message string.
 */
export function extractMessageVariables(message: string): MessageVariable[] {
  const ast = parse(message)
  const vars = new Map<string, string>()
  collectVariablesFromNodes(ast, vars)
  return [...vars.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, type]) => ({ name, type }))
}

function collectVariablesFromNodes(nodes: ASTNode[], vars: Map<string, string>): void {
  for (const node of nodes) {
    switch (node.type) {
      case 'variable':
        if (node.name !== '#' && !vars.has(node.name)) {
          vars.set((node as VariableNode).name, 'string | number')
        }
        break
      case 'plural': {
        const pn = node as PluralNode
        // Plural variable is always a number
        vars.set(pn.variable, 'number')
        // Recurse into plural option bodies
        for (const optionNodes of Object.values(pn.options)) {
          collectVariablesFromNodes(optionNodes, vars)
        }
        break
      }
      case 'select': {
        const sn = node as SelectNode
        const keys = Object.keys(sn.options).filter((k) => k !== 'other')
        const hasOther = 'other' in sn.options
        const literalTypes = keys.map((k) => `'${k}'`).join(' | ')
        const selectType = hasOther
          ? (keys.length > 0 ? `${literalTypes} | string` : 'string')
          : (keys.length > 0 ? literalTypes : 'string')
        vars.set(sn.variable, selectType)
        // Recurse into select option bodies
        for (const optionNodes of Object.values(sn.options)) {
          collectVariablesFromNodes(optionNodes, vars)
        }
        break
      }
      case 'function':
        if (!vars.has((node as FunctionNode).variable)) {
          vars.set((node as FunctionNode).variable, 'string | number')
        }
        break
      case 'text':
        break
    }
  }
}

/**
 * Generate a TypeScript declaration file with MessageId union and MessageValues interface.
 */
export function compileTypeDeclaration(
  allIds: string[],
  catalogs: Record<string, CatalogData>,
  sourceLocale: string,
): string {
  const lines: string[] = []
  lines.push('// Auto-generated by @fluenti/cli — do not edit')
  lines.push('')

  // MessageId union
  if (allIds.length === 0) {
    lines.push('export type MessageId = never')
  } else {
    lines.push('export type MessageId =')
    for (const id of allIds) {
      lines.push(`  | '${escapeStringLiteral(id)}'`)
    }
  }

  lines.push('')

  // MessageValues interface
  lines.push('export interface MessageValues {')
  for (const id of allIds) {
    // Use source locale catalog to get the message for variable extraction
    const sourceCatalog = catalogs[sourceLocale]
    const entry = sourceCatalog?.[id]
    const message = entry?.message ?? id
    const vars = extractMessageVariables(message)

    const escapedId = escapeStringLiteral(id)
    if (vars.length === 0) {
      lines.push(`  '${escapedId}': Record<string, never>`)
    } else {
      const fields = vars.map((v) => `${v.name}: ${v.type}`).join('; ')
      lines.push(`  '${escapedId}': { ${fields} }`)
    }
  }
  lines.push('}')
  lines.push('')

  return lines.join('\n')
}
