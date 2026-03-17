/**
 * Build-mode transform for code-splitting.
 *
 * Strategy 'dynamic': rewrites $t('id') / t() calls to __catalog._<hash> references.
 * Strategy 'static': rewrites to direct named imports from compiled locale modules.
 */

import { hashMessage } from '@fluenti/core'

export interface BuildTransformResult {
  code: string
  needsCatalogImport: boolean
  usedHashes: Set<string>
}

// Match $t('msgId'), $t("msgId"), $t(`msgId`) — with optional _ctx./$setup. prefix.
// Uses backreference \1 to match the same quote type.
// Group 1: quote char, Group 2: message ID, Group 3: values object
const T_CALL_REGEX = /(?:[\w$]+\.)?\$t\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1\s*(?:,\s*(\{[^}]*\}))?\s*\)/g

/**
 * Transform $t('msgId') and $t('msgId', { ... }) calls to __catalog._<hash> references.
 * Used in dynamic splitting strategy.
 *
 * Also handles Vue compiled template patterns like _ctx.$t('msgId') or _ctx.$t(`msgId`)
 * by including the prefix in the match span so the replacement removes it.
 */
export function transformForDynamicSplit(code: string): BuildTransformResult {
  let result = code
  let needsCatalogImport = false
  const usedHashes = new Set<string>()

  const regex = new RegExp(T_CALL_REGEX.source, T_CALL_REGEX.flags)
  let match: RegExpExecArray | null

  const replacements: Array<{ start: number; end: number; replacement: string }> = []

  while ((match = regex.exec(code)) !== null) {
    const msgId = match[2]!
    const values = match[3]
    const hash = hashMessage(msgId)
    const exportName = `_${hash}`
    usedHashes.add(hash)
    needsCatalogImport = true

    const replacement = values
      ? `__catalog.${exportName}(${values})`
      : `__catalog.${exportName}`

    replacements.push({ start: match.index, end: match.index + match[0].length, replacement })
  }

  // Apply replacements in reverse order
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = replacements[i]!
    result = result.slice(0, start) + replacement + result.slice(end)
  }

  return { code: result, needsCatalogImport, usedHashes }
}

/**
 * Transform $t('msgId') calls to direct named import references.
 * Used in static splitting strategy (SSR).
 */
export function transformForStaticSplit(code: string): BuildTransformResult {
  let result = code
  let needsCatalogImport = false
  const usedHashes = new Set<string>()

  const regex = new RegExp(T_CALL_REGEX.source, T_CALL_REGEX.flags)
  let match: RegExpExecArray | null

  const replacements: Array<{ start: number; end: number; replacement: string }> = []

  while ((match = regex.exec(code)) !== null) {
    const msgId = match[2]!
    const values = match[3]
    const hash = hashMessage(msgId)
    const exportName = `_${hash}`
    usedHashes.add(hash)
    needsCatalogImport = true

    const replacement = values
      ? `${exportName}(${values})`
      : `${exportName}`

    replacements.push({ start: match.index, end: match.index + match[0].length, replacement })
  }

  // Apply replacements in reverse order
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = replacements[i]!
    result = result.slice(0, start) + replacement + result.slice(end)
  }

  return { code: result, needsCatalogImport, usedHashes }
}

/**
 * Inject the catalog import statement at the top of the module.
 */
export function injectCatalogImport(code: string, strategy: 'dynamic' | 'static' | 'per-route', hashes: Set<string>): string {
  if (strategy === 'dynamic') {
    return `import { __catalog } from 'virtual:fluenti/runtime';\n${code}`
  }

  if (strategy === 'per-route') {
    return `import { __catalog } from 'virtual:fluenti/route-runtime';\n${code}`
  }

  // Static: import named exports directly
  const imports = [...hashes].map((h) => `_${h}`).join(', ')
  return `import { ${imports} } from 'virtual:fluenti/messages';\n${code}`
}
