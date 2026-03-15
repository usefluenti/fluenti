import type { ExtractedMessage } from '@fluenti/core'

export interface CatalogEntry {
  message?: string | undefined
  translation?: string | undefined
  origin?: string | undefined
  obsolete?: boolean | undefined
}

export type CatalogData = Record<string, CatalogEntry>

export interface UpdateResult {
  added: number
  unchanged: number
  obsolete: number
}

/** Update catalog with newly extracted messages */
export function updateCatalog(
  existing: CatalogData,
  extracted: ExtractedMessage[],
): { catalog: CatalogData; result: UpdateResult } {
  const extractedIds = new Set(extracted.map((m) => m.id))
  const catalog: CatalogData = {}
  let added = 0
  let unchanged = 0
  let obsolete = 0

  // Process extracted messages
  for (const msg of extracted) {
    const existingEntry = existing[msg.id]
    const origin = `${msg.origin.file}:${msg.origin.line}`

    if (existingEntry) {
      catalog[msg.id] = {
        ...existingEntry,
        message: msg.message ?? existingEntry.message,
        origin,
        obsolete: false,
      }
      unchanged++
    } else {
      catalog[msg.id] = {
        message: msg.message,
        origin,
      }
      added++
    }
  }

  // Mark messages no longer in source as obsolete (don't delete)
  for (const [id, entry] of Object.entries(existing)) {
    if (!extractedIds.has(id)) {
      catalog[id] = {
        ...entry,
        obsolete: true,
      }
      obsolete++
    }
  }

  return { catalog, result: { added, unchanged, obsolete } }
}
