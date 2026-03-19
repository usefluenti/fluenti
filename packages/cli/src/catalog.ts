import type { ExtractedMessage } from '@fluenti/core'

export interface CatalogEntry {
  message?: string | undefined
  context?: string | undefined
  comment?: string | undefined
  translation?: string | undefined
  origin?: string | string[] | undefined
  obsolete?: boolean | undefined
  fuzzy?: boolean | undefined
}

export type CatalogData = Record<string, CatalogEntry>

export interface UpdateResult {
  added: number
  unchanged: number
  obsolete: number
}

export interface UpdateCatalogOptions {
  stripFuzzy?: boolean
}

/** Update catalog with newly extracted messages */
export function updateCatalog(
  existing: CatalogData,
  extracted: ExtractedMessage[],
  options?: UpdateCatalogOptions,
): { catalog: CatalogData; result: UpdateResult } {
  const extractedIds = new Set(extracted.map((m) => m.id))
  const consumedCarryForwardIds = new Set<string>()
  const catalog: CatalogData = {}
  let added = 0
  let unchanged = 0
  let obsolete = 0

  for (const msg of extracted) {
    const existingEntry = existing[msg.id]
    const carried = existingEntry
      ? undefined
      : findCarryForwardEntry(existing, msg, consumedCarryForwardIds)
    const origin = `${msg.origin.file}:${msg.origin.line}`
    const baseEntry = existingEntry ?? carried?.entry

    if (carried) {
      consumedCarryForwardIds.add(carried.id)
    }

    if (baseEntry) {
      catalog[msg.id] = {
        ...baseEntry,
        message: msg.message ?? baseEntry.message,
        context: msg.context,
        comment: msg.comment,
        origin,
        obsolete: false,
      }
      unchanged++
    } else if (catalog[msg.id]) {
      // Same ID already seen in this extraction batch — merge origin
      const existing = catalog[msg.id]!
      catalog[msg.id] = {
        ...existing,
        origin: mergeOrigins(existing.origin, origin),
      }
    } else {
      catalog[msg.id] = {
        message: msg.message,
        context: msg.context,
        comment: msg.comment,
        origin,
      }
      added++
    }

    if (options?.stripFuzzy) {
      const { fuzzy: _fuzzy, ...rest } = catalog[msg.id]!
      catalog[msg.id] = rest
    }
  }

  for (const [id, entry] of Object.entries(existing)) {
    if (!extractedIds.has(id)) {
      const { fuzzy: _fuzzy, ...rest } = entry
      const obsoleteEntry = options?.stripFuzzy
        ? { ...rest, obsolete: true }
        : { ...entry, obsolete: true }
      catalog[id] = obsoleteEntry
      obsolete++
    }
  }

  return { catalog, result: { added, unchanged, obsolete } }
}

function mergeOrigins(
  existing: string | string[] | undefined,
  newOrigin: string,
): string | string[] {
  if (!existing) return newOrigin
  const existingArray = Array.isArray(existing) ? existing : [existing]
  const merged = [...new Set([...existingArray, newOrigin])]
  return merged.length === 1 ? merged[0]! : merged
}

function findCarryForwardEntry(
  existing: CatalogData,
  extracted: ExtractedMessage,
  consumedCarryForwardIds: Set<string>,
): { id: string; entry: CatalogEntry } | undefined {
  if (!extracted.context) {
    return undefined
  }

  const extractedOrigin = `${extracted.origin.file}:${extracted.origin.line}`
  for (const [id, entry] of Object.entries(existing)) {
    if (consumedCarryForwardIds.has(id)) continue
    if (entry.context !== undefined) continue
    if (entry.message !== extracted.message) continue
    if (!sameOrigin(entry.origin, extractedOrigin)) continue
    return { id, entry }
  }

  return undefined
}

function sameOrigin(previous: string | string[] | undefined, next: string): boolean {
  if (!previous) return false
  const origins = Array.isArray(previous) ? previous : [previous]
  return origins.some((o) => o === next || originFile(o) === originFile(next))
}

function originFile(origin: string): string {
  const match = origin.match(/^(.*):\d+$/)
  return match?.[1] ?? origin
}
