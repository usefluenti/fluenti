import consola from 'consola'
import type { CatalogData } from './catalog'
import { invokeAI } from './ai-provider'
import type { AIProvider } from './ai-provider'
import { buildTranslatePrompt } from './translate-prompt'
import { parseTranslateResponse } from './translate-parse'

export type { AIProvider } from './ai-provider'

export function getUntranslatedEntries(catalog: CatalogData): Record<string, string> {
  const entries: Record<string, string> = {}
  for (const [id, entry] of Object.entries(catalog)) {
    if (entry.obsolete) continue
    if (!entry.translation || entry.translation.length === 0) {
      entries[id] = entry.message ?? id
    }
  }
  return entries
}

export function chunkEntries(
  entries: Record<string, string>,
  batchSize: number,
): Array<Record<string, string>> {
  const keys = Object.keys(entries)
  const chunks: Array<Record<string, string>> = []

  for (let i = 0; i < keys.length; i += batchSize) {
    const chunk: Record<string, string> = {}
    for (const key of keys.slice(i, i + batchSize)) {
      chunk[key] = entries[key]!
    }
    chunks.push(chunk)
  }

  return chunks
}

export interface TranslateOptions {
  readonly provider: AIProvider
  readonly sourceLocale: string
  readonly targetLocale: string
  readonly catalog: CatalogData
  readonly batchSize: number
  readonly context?: string | undefined
  readonly glossary?: Record<string, string> | undefined
  readonly timeoutMs?: number | undefined
}

export async function translateCatalog(options: TranslateOptions): Promise<{
  catalog: CatalogData
  translated: number
  warnings: string[]
}> {
  const { provider, sourceLocale, targetLocale, catalog, batchSize, context, glossary, timeoutMs } = options

  const untranslated = getUntranslatedEntries(catalog)
  const count = Object.keys(untranslated).length

  if (count === 0) {
    return { catalog: { ...catalog }, translated: 0, warnings: [] }
  }

  consola.info(`  ${count} untranslated messages, translating with ${provider}...`)

  const result = { ...catalog }
  const batches = chunkEntries(untranslated, batchSize)
  let totalTranslated = 0
  const allWarnings: string[] = []

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!
    const batchKeys = Object.keys(batch)

    if (batches.length > 1) {
      consola.info(`  Batch ${i + 1}/${batches.length} (${batchKeys.length} messages)`)
    }

    try {
      const prompt = buildTranslatePrompt({
        sourceLocale,
        targetLocale,
        messages: batch,
        glossary,
        context,
      })
      const { stdout: response } = await invokeAI({ provider, prompt, timeoutMs })
      const { translations, warnings } = parseTranslateResponse(response, batch)

      for (const warning of warnings) {
        allWarnings.push(`[${targetLocale}] ${warning}`)
        consola.warn(`  ${warning}`)
      }

      for (const key of batchKeys) {
        if (key in translations) {
          result[key] = {
            ...result[key],
            translation: translations[key],
          }
          totalTranslated++
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      allWarnings.push(`[${targetLocale}] Batch ${i + 1} failed: ${msg}`)
      consola.error(`  Batch ${i + 1} failed: ${msg}`)
    }
  }

  return { catalog: result, translated: totalTranslated, warnings: allWarnings }
}
