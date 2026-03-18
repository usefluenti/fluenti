import type { CatalogData } from './catalog'
import { hashMessage } from '@fluenti/core'
import * as gettextParser from 'gettext-parser'

const CUSTOM_ID_MARKER = 'fluenti-id:'

interface POTranslation {
  msgid: string
  msgctxt?: string
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
  const translations = po.translations ?? {}

  for (const [contextKey, entries] of Object.entries(translations)) {
    for (const [msgid, entry] of Object.entries(entries)) {
      if (!msgid) continue

      const context = contextKey || entry.msgctxt || undefined
      const translation = entry.msgstr?.[0] ?? undefined
      const origin = entry.comments?.reference ?? undefined
      const isObsolete = entry.comments?.flag?.includes('fuzzy') ?? false
      const { comment, customId } = parseExtractedComment(entry.comments?.extracted)
      const id = customId ?? hashMessage(msgid, context)

      catalog[id] = {
        message: msgid,
        ...(context !== undefined ? { context } : {}),
        ...(comment !== undefined ? { comment } : {}),
        ...(translation ? { translation } : {}),
        ...(origin !== undefined ? { origin } : {}),
        ...(isObsolete ? { obsolete: isObsolete } : {}),
      }
    }
  }

  return catalog
}

/** Write a catalog to PO format */
export function writePoCatalog(catalog: CatalogData): string {
  const translations: POData['translations'] = {
    '': {
      '': {
        msgid: '',
        msgstr: ['Content-Type: text/plain; charset=UTF-8\n'],
      },
    },
  }

  for (const [id, entry] of Object.entries(catalog)) {
    const poEntry: POTranslation = {
      msgid: entry.message ?? id,
      ...(entry.context !== undefined ? { msgctxt: entry.context } : {}),
      msgstr: [entry.translation ?? ''],
    }

    const comments: POTranslation['comments'] = {}
    if (entry.origin) {
      comments.reference = entry.origin
    }
    const extractedComment = buildExtractedComment(id, entry.message ?? id, entry.context, entry.comment)
    if (extractedComment) {
      comments.extracted = extractedComment
    }
    if (entry.obsolete) {
      comments.flag = 'fuzzy'
    }
    if (comments.reference || comments.extracted || comments.flag) {
      poEntry.comments = comments
    }

    const contextKey = entry.context ?? ''
    translations[contextKey] ??= {}
    translations[contextKey][poEntry.msgid] = poEntry
  }

  const poData: POData = {
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
    },
    translations,
  }

  const buffer = gettextParser.po.compile(poData as Parameters<typeof gettextParser.po.compile>[0])
  return buffer.toString()
}

function parseExtractedComment(
  extracted: string | undefined,
): { comment?: string; customId?: string } {
  if (!extracted) {
    return {}
  }

  const lines = extracted.split('\n').map((line) => line.trim()).filter(Boolean)
  let customId: string | undefined
  const commentLines: string[] = []

  for (const line of lines) {
    if (line.startsWith(CUSTOM_ID_MARKER)) {
      customId = line.slice(CUSTOM_ID_MARKER.length).trim() || undefined
      continue
    }
    commentLines.push(line)
  }

  return {
    ...(commentLines.length > 0 ? { comment: commentLines.join('\n') } : {}),
    ...(customId ? { customId } : {}),
  }
}

function buildExtractedComment(
  id: string,
  message: string,
  context: string | undefined,
  comment: string | undefined,
): string | undefined {
  const lines: string[] = []

  if (comment) {
    lines.push(comment)
  }

  if (id !== hashMessage(message, context)) {
    lines.push(`${CUSTOM_ID_MARKER} ${id}`)
  }

  return lines.length > 0 ? lines.join('\n') : undefined
}
