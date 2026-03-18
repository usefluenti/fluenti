/**
 * Utilities for per-route message splitting.
 *
 * - deriveRouteName: strips hash/dir/ext from chunk filenames to produce stable route IDs
 * - parseCompiledCatalog: extracts Map<hash, exportLine> from compiled catalog source
 * - readCatalogSource: reads compiled catalog file from disk
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { hashMessage } from '@fluenti/core'

/**
 * Derive a stable route name from a Rollup chunk filename.
 *
 * Examples:
 *   'assets/index-abc123.js'  → 'index'
 *   'assets/about-def456.js'  → 'about'
 *   'pages/settings-g7h8.js'  → 'settings'
 *   'index.js'                → 'index'
 */
export function deriveRouteName(chunkFileName: string): string {
  // Strip directory prefix
  const base = chunkFileName.includes('/')
    ? chunkFileName.slice(chunkFileName.lastIndexOf('/') + 1)
    : chunkFileName

  // Strip extension
  const withoutExt = base.replace(/\.[^.]+$/, '')

  // Strip trailing hash (e.g., 'index-abc123' → 'index')
  // Hash pattern: dash followed by alphanumeric chars at end
  const withoutHash = withoutExt.replace(/-[a-zA-Z0-9]{4,}$/, '')

  return withoutHash || withoutExt
}

/**
 * Parse a compiled catalog source and extract named exports by hash.
 *
 * The CLI outputs lines like:
 *   export const _abc123 = "Hello"
 *   export const _def456 = (v) => `Hello ${v.name}`
 *
 * Returns a Map from hash (without underscore prefix) to the full export line.
 */
export function parseCompiledCatalog(source: string): Map<string, string> {
  const exports = new Map<string, string>()

  // Match lines: export const _<hash> = <anything until end of statement>
  // Handles multi-line arrow functions by tracking balanced braces
  const lines = source.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const match = line.match(/^(?:\/\*.*?\*\/\s*)?export\s+const\s+_([a-z0-9]+)\s*=\s*/)
    if (!match) continue

    const hash = match[1]!

    // Collect the full statement — may span multiple lines if it contains template literals or functions
    let statement = line
    let braceDepth = 0
    let parenDepth = 0
    let templateDepth = 0

    for (const ch of line.slice(match[0].length)) {
      if (ch === '{') braceDepth++
      if (ch === '}') braceDepth--
      if (ch === '(') parenDepth++
      if (ch === ')') parenDepth--
      if (ch === '`') templateDepth = templateDepth === 0 ? 1 : 0
    }

    while ((braceDepth > 0 || parenDepth > 0 || templateDepth > 0) && i + 1 < lines.length) {
      i++
      const nextLine = lines[i]!
      statement += '\n' + nextLine
      for (const ch of nextLine) {
        if (ch === '{') braceDepth++
        if (ch === '}') braceDepth--
        if (ch === '(') parenDepth++
        if (ch === ')') parenDepth--
        if (ch === '`') templateDepth = templateDepth === 0 ? 1 : 0
      }
    }

    exports.set(hash, statement)
  }

  return exports
}

/**
 * Build a JS module that re-exports only the specified hashes from a catalog.
 *
 * Given hashes ['abc', 'def'] and catalog exports, produces:
 *   export const _abc = "Hello"
 *   export const _def = (v) => `Hi ${v.name}`
 */
export function buildChunkModule(
  catalogIds: ReadonlySet<string>,
  catalogExports: Map<string, string>,
): string {
  const lines: string[] = []
  const defaultEntries: string[] = []

  for (const catalogId of catalogIds) {
    const exportHash = hashMessage(catalogId)
    const exportLine = catalogExports.get(exportHash)
    if (exportLine) {
      lines.push(exportLine)
      defaultEntries.push(`  '${escapeStringLiteral(catalogId)}': _${exportHash},`)
    }
  }

  if (defaultEntries.length > 0) {
    lines.push('', 'export default {', ...defaultEntries, '}')
  }

  return lines.join('\n') + '\n'
}

/**
 * Read a compiled catalog file from disk.
 * Returns the source string, or undefined if the file doesn't exist.
 */
export function readCatalogSource(catalogDir: string, locale: string): string | undefined {
  try {
    return readFileSync(resolve(catalogDir, `${locale}.js`), 'utf-8')
  } catch {
    return undefined
  }
}

function escapeStringLiteral(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
}
