import type { CatalogData } from './catalog'

/** Read a JSON catalog file */
export function readJsonCatalog(content: string): CatalogData {
  const raw = JSON.parse(content) as Record<string, unknown>
  const catalog: CatalogData = {}

  for (const [id, entry] of Object.entries(raw)) {
    if (typeof entry === 'object' && entry !== null) {
      const e = entry as Record<string, unknown>
      catalog[id] = {
        message: typeof e['message'] === 'string' ? e['message'] : undefined,
        context: typeof e['context'] === 'string' ? e['context'] : undefined,
        comment: typeof e['comment'] === 'string' ? e['comment'] : undefined,
        translation: typeof e['translation'] === 'string' ? e['translation'] : undefined,
        origin: typeof e['origin'] === 'string' ? e['origin'] : undefined,
        obsolete: typeof e['obsolete'] === 'boolean' ? e['obsolete'] : undefined,
      }
    }
  }

  return catalog
}

/** Write a catalog to JSON format */
export function writeJsonCatalog(catalog: CatalogData): string {
  const output: Record<string, Record<string, unknown>> = {}

  for (const [id, entry] of Object.entries(catalog)) {
    const obj: Record<string, unknown> = {}
    if (entry.message !== undefined) obj['message'] = entry.message
    if (entry.context !== undefined) obj['context'] = entry.context
    if (entry.comment !== undefined) obj['comment'] = entry.comment
    if (entry.translation !== undefined) obj['translation'] = entry.translation
    if (entry.origin !== undefined) obj['origin'] = entry.origin
    if (entry.obsolete) obj['obsolete'] = true
    output[id] = obj
  }

  return JSON.stringify(output, null, 2) + '\n'
}
