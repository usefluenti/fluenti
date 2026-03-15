/**
 * Browser-safe catalog management.
 * Mirrors @fluenti/cli catalog and format logic.
 */

import type { ExtractedMessage } from './extract'

export interface CatalogEntry {
  readonly message?: string
  readonly translation?: string
  readonly origin?: string
  readonly obsolete?: boolean
}

export type CatalogData = Record<string, CatalogEntry>

/** Build catalog from extracted messages */
export function buildCatalog(extracted: readonly ExtractedMessage[]): CatalogData {
  const catalog: CatalogData = {}
  for (const msg of extracted) {
    const origin = `${msg.origin.file}:${msg.origin.line}`
    catalog[msg.id] = { message: msg.message, origin }
  }
  return catalog
}

/** Write catalog as JSON string */
export function writeJsonCatalog(catalog: CatalogData): string {
  const output: Record<string, Record<string, unknown>> = {}
  for (const [id, entry] of Object.entries(catalog)) {
    const obj: Record<string, unknown> = {}
    if (entry.message !== undefined) obj['message'] = entry.message
    if (entry.translation !== undefined) obj['translation'] = entry.translation
    if (entry.origin !== undefined) obj['origin'] = entry.origin
    if (entry.obsolete) obj['obsolete'] = true
    output[id] = obj
  }
  return JSON.stringify(output, null, 2) + '\n'
}

/** Write catalog as PO format string */
export function writePoCatalog(catalog: CatalogData): string {
  const lines: string[] = []
  lines.push('msgid ""')
  lines.push('msgstr "Content-Type: text/plain; charset=UTF-8\\n"')
  lines.push('')

  for (const [id, entry] of Object.entries(catalog)) {
    const message = entry.message ?? id
    const translation = entry.translation ?? ''

    if (entry.origin) {
      lines.push(`#: ${entry.origin}`)
    }
    if (entry.obsolete) {
      lines.push('#, fuzzy')
    }
    lines.push(`msgid "${escapePo(message)}"`)
    lines.push(`msgstr "${escapePo(translation)}"`)
    lines.push('')
  }

  return lines.join('\n')
}

function escapePo(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
}
