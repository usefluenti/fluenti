import type { CatalogData } from './catalog'
import * as gettextParser from 'gettext-parser'

interface POTranslation {
  msgid: string
  msgstr: string[]
  comments?: {
    reference?: string
    extracted?: string
    flag?: string
    translator?: string
    previous?: string
  }
}

interface POData {
  headers?: Record<string, string>
  translations: Record<string, Record<string, POTranslation>>
}

/** Read a PO catalog file */
export function readPoCatalog(content: string): CatalogData {
  const po = gettextParser.po.parse(content) as POData
  const catalog: CatalogData = {}
  const translations = po.translations?.[''] ?? {}

  for (const [msgid, entry] of Object.entries(translations)) {
    if (!msgid) continue // skip header entry

    const translation = entry.msgstr?.[0] ?? undefined
    const origin = entry.comments?.reference ?? undefined
    const isObsolete = entry.comments?.flag?.includes('fuzzy') ?? false

    catalog[msgid] = {
      message: msgid,
      ...(translation ? { translation } : {}),
      ...(origin !== undefined ? { origin } : {}),
      ...(isObsolete ? { obsolete: isObsolete } : {}),
    }
  }

  return catalog
}

/** Write a catalog to PO format */
export function writePoCatalog(catalog: CatalogData): string {
  const translations: Record<string, POTranslation> = {
    '': {
      msgid: '',
      msgstr: ['Content-Type: text/plain; charset=UTF-8\n'],
    },
  }

  for (const [id, entry] of Object.entries(catalog)) {
    const poEntry: POTranslation = {
      msgid: entry.message ?? id,
      msgstr: [entry.translation ?? ''],
    }

    const comments: POTranslation['comments'] = {}
    if (entry.origin) {
      comments.reference = entry.origin
    }
    if (entry.obsolete) {
      comments.flag = 'fuzzy'
    }
    if (comments.reference || comments.flag) {
      poEntry.comments = comments
    }

    translations[poEntry.msgid] = poEntry
  }

  const poData: POData = {
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
    },
    translations: { '': translations },
  }

  const buffer = gettextParser.po.compile(poData as Parameters<typeof gettextParser.po.compile>[0])
  return buffer.toString()
}
