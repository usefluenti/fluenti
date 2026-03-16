/**
 * Programmatic catalog compilation.
 * Wraps @fluenti/cli's compile logic for use inside the Next.js plugin.
 */

import { resolve } from 'node:path'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'

interface CatalogEntry {
  message?: string
  translation?: string
  obsolete?: boolean
}

type CatalogData = Record<string, CatalogEntry>

// ─── Catalog readers ────────────────────────────────────────────────────────

function readJsonCatalog(filePath: string): CatalogData {
  if (!existsSync(filePath)) return {}
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'))
  const catalog: CatalogData = {}
  for (const [id, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      catalog[id] = { message: id, translation: value }
    } else if (typeof value === 'object' && value !== null) {
      catalog[id] = value as CatalogEntry
    }
  }
  return catalog
}

function readPoCatalog(filePath: string): CatalogData {
  if (!existsSync(filePath)) return {}
  const content = readFileSync(filePath, 'utf-8')
  const catalog: CatalogData = {}

  // Simple PO parser — handles msgid/msgstr pairs
  const entries = content.split(/\n\n+/)
  for (const block of entries) {
    const lines = block.split('\n')
    let msgid = ''
    let msgstr = ''
    let obsolete = false
    let currentField: 'msgid' | 'msgstr' | null = null

    for (const line of lines) {
      if (line.startsWith('#~ ')) {
        obsolete = true
        continue
      }
      if (line.startsWith('msgid ')) {
        currentField = 'msgid'
        msgid = extractPoString(line.slice(6))
      } else if (line.startsWith('msgstr ')) {
        currentField = 'msgstr'
        msgstr = extractPoString(line.slice(7))
      } else if (line.startsWith('"') && currentField) {
        const value = extractPoString(line)
        if (currentField === 'msgid') msgid += value
        else msgstr += value
      }
    }

    if (msgid) {
      const entry: CatalogEntry = { message: msgid, obsolete }
      if (msgstr) entry.translation = msgstr
      catalog[msgid] = entry
    }
  }

  return catalog
}

function extractPoString(s: string): string {
  const match = s.match(/^"(.*)"$/)
  if (!match) return ''
  return match[1]!
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

// ─── Compiler ───────────────────────────────────────────────────────────────

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

function compileCatalog(catalog: CatalogData): string {
  const lines: string[] = []
  lines.push('export default {')

  const entries = Object.entries(catalog).filter(([, entry]) => !entry.obsolete)

  for (const [id, entry] of entries) {
    const translated = entry.translation ?? entry.message ?? ''

    if (hasVariables(translated)) {
      const templateStr = messageToTemplateString(escapeTemplateLiteral(translated))
      lines.push(`  '${escapeStringLiteral(id)}': (v) => \`${templateStr}\`,`)
    } else {
      lines.push(`  '${escapeStringLiteral(id)}': '${escapeStringLiteral(translated)}',`)
    }
  }

  lines.push('}')
  lines.push('')

  return lines.join('\n')
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface CompileOptions {
  catalogDir: string
  compileOutDir: string
  locales: string[]
  format: 'json' | 'po'
}

export function compileAll(options: CompileOptions): void {
  const { catalogDir, compileOutDir, locales, format } = options
  const ext = format === 'json' ? '.json' : '.po'
  const readCatalog = format === 'json' ? readJsonCatalog : readPoCatalog

  mkdirSync(compileOutDir, { recursive: true })

  for (const locale of locales) {
    const catalogPath = resolve(catalogDir, `${locale}${ext}`)
    const catalog = readCatalog(catalogPath)
    const compiled = compileCatalog(catalog)
    const outPath = resolve(compileOutDir, `${locale}.ts`)
    writeFileSync(outPath, compiled, 'utf-8')
  }
}
