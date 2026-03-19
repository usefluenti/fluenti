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

interface ParsedExtractedComment {
  comment?: string
  customId?: string
  sourceMessage?: string
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
      const rawReference = entry.comments?.reference ?? undefined
      const origin = rawReference?.includes('\n')
        ? rawReference.split('\n').map((r: string) => r.trim()).filter(Boolean)
        : rawReference?.includes(' ')
          ? rawReference.split(/\s+/).filter(Boolean)
          : rawReference
      const normalizedOrigin = Array.isArray(origin) && origin.length === 1 ? origin[0] : origin
      const isFuzzy = entry.comments?.flag?.includes('fuzzy') ?? false
      const { comment, customId, sourceMessage } = parseExtractedComment(entry.comments?.extracted)
      const resolvedSourceMessage = sourceMessage
        && hashMessage(sourceMessage, context) === msgid
        ? sourceMessage
        : undefined
      const id = customId
        ?? (resolvedSourceMessage ? msgid : hashMessage(msgid, context))

      catalog[id] = {
        message: resolvedSourceMessage ?? msgid,
        ...(context !== undefined ? { context } : {}),
        ...(comment !== undefined ? { comment } : {}),
        ...(translation ? { translation } : {}),
        ...(normalizedOrigin !== undefined ? { origin: normalizedOrigin } : {}),
        ...(isFuzzy ? { fuzzy: true } : {}),
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
      comments.reference = Array.isArray(entry.origin)
        ? entry.origin.join('\n')
        : entry.origin
    }
    const extractedComment = buildExtractedComment(id, entry.message ?? id, entry.context, entry.comment)
    if (extractedComment) {
      comments.extracted = extractedComment
    }
    if (entry.fuzzy) {
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
): ParsedExtractedComment {
  if (!extracted) {
    return {}
  }

  const lines = extracted.split('\n').map((line) => line.trim()).filter(Boolean)
  let customId: string | undefined
  let sourceMessage: string | undefined
  const commentLines: string[] = []

  for (const line of lines) {
    if (line.startsWith(CUSTOM_ID_MARKER)) {
      customId = line.slice(CUSTOM_ID_MARKER.length).trim() || undefined
      continue
    }
    if (line.startsWith('msg`') && line.endsWith('`')) {
      sourceMessage = line.slice(4, -1)
      continue
    }
    if (line.startsWith('Trans: ')) {
      sourceMessage = normalizeRichTextComment(line.slice('Trans: '.length))
      continue
    }
    commentLines.push(line)
  }

  return {
    ...(commentLines.length > 0 ? { comment: commentLines.join('\n') } : {}),
    ...(customId ? { customId } : {}),
    ...(sourceMessage ? { sourceMessage } : {}),
  }
}

function normalizeRichTextComment(comment: string): string {
  let stack: Array<{ tag: string; index: number }> = []
  let nextIndex = 0

  return comment.replace(/<\/?([a-zA-Z][\w-]*)>/g, (match, rawTag: string) => {
    const tag = rawTag
    if (match.startsWith('</')) {
      for (let index = stack.length - 1; index >= 0; index--) {
        const entry = stack[index]
        if (entry?.tag !== tag) continue
        stack = stack.filter((_, i) => i !== index)
        return `</${entry.index}>`
      }
      return match
    }

    const index = nextIndex++
    stack.push({ tag, index })
    return `<${index}>`
  })
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
