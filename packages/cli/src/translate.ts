import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import consola from 'consola'
import type { CatalogData } from './catalog'

const execFileAsync = promisify(execFile)

export type AIProvider = 'claude' | 'codex'

export function buildPrompt(
  sourceLocale: string,
  targetLocale: string,
  messages: Record<string, string>,
  context?: string,
): string {
  const json = JSON.stringify(messages, null, 2)
  return [
    `You are a professional translator. Translate the following messages from "${sourceLocale}" to "${targetLocale}".`,
    '',
    ...(context ? [`Project context: ${context}`, ''] : []),
    `Input (JSON):`,
    json,
    '',
    'Rules:',
    '- Output ONLY valid JSON with the same keys and translated values.',
    '- Keep ICU MessageFormat placeholders like {name}, {count}, {gender} unchanged.',
    '- Keep HTML tags unchanged.',
    '- Do not add any explanation or markdown formatting, output raw JSON only.',
  ].join('\n')
}

async function invokeAI(provider: AIProvider, prompt: string): Promise<string> {
  const maxBuffer = 10 * 1024 * 1024

  try {
    if (provider === 'claude') {
      const { stdout } = await execFileAsync('claude', ['-p', prompt], { maxBuffer })
      return stdout
    } else {
      const { stdout } = await execFileAsync('codex', ['-p', prompt, '--full-auto'], { maxBuffer })
      return stdout
    }
  } catch (error: unknown) {
    const err = error as Error & { code?: string }
    if (err.code === 'ENOENT') {
      throw new Error(
        `"${provider}" CLI not found. Please install it first:\n` +
        (provider === 'claude'
          ? '  npm install -g @anthropic-ai/claude-code'
          : '  npm install -g @openai/codex'),
      )
    }
    throw error
  }
}

export function extractJSON(text: string): Record<string, string> {
  // Try to find a JSON object in the response
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error('No JSON object found in AI response')
  }
  const parsed = JSON.parse(match[0])
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('AI response is not a valid JSON object')
  }
  return parsed as Record<string, string>
}

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
  provider: AIProvider
  sourceLocale: string
  targetLocale: string
  catalog: CatalogData
  batchSize: number
  context?: string
}

export async function translateCatalog(options: TranslateOptions): Promise<{
  catalog: CatalogData
  translated: number
}> {
  const { provider, sourceLocale, targetLocale, catalog, batchSize, context } = options

  const untranslated = getUntranslatedEntries(catalog)
  const count = Object.keys(untranslated).length

  if (count === 0) {
    return { catalog: { ...catalog }, translated: 0 }
  }

  consola.info(`  ${count} untranslated messages, translating with ${provider}...`)

  const result = { ...catalog }
  const batches = chunkEntries(untranslated, batchSize)
  let totalTranslated = 0

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!
    const batchKeys = Object.keys(batch)

    if (batches.length > 1) {
      consola.info(`  Batch ${i + 1}/${batches.length} (${batchKeys.length} messages)`)
    }

    const prompt = buildPrompt(sourceLocale, targetLocale, batch, context)
    const response = await invokeAI(provider, prompt)
    const translations = extractJSON(response)

    for (const key of batchKeys) {
      if (translations[key] && typeof translations[key] === 'string') {
        result[key] = {
          ...result[key],
          translation: translations[key],
        }
        totalTranslated++
      } else {
        consola.warn(`  Missing translation for key: ${key}`)
      }
    }
  }

  return { catalog: result, translated: totalTranslated }
}
