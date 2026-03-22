import { readFileSync, existsSync } from 'node:fs'

export type GlossaryData = Record<string, Record<string, string>>

export function loadGlossary(glossaryPath: string): GlossaryData {
  if (!existsSync(glossaryPath)) {
    return {}
  }

  let parsed: unknown
  try {
    const content = readFileSync(glossaryPath, 'utf-8')
    parsed = JSON.parse(content) as unknown
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Invalid glossary format: failed to parse JSON — ${message}`)
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid glossary format: root must be a plain object')
  }

  for (const [term, mappings] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof mappings !== 'object' || mappings === null || Array.isArray(mappings)) {
      throw new Error(`Invalid glossary format: value for "${term}" must be a plain object`)
    }
    for (const [locale, translation] of Object.entries(mappings as Record<string, unknown>)) {
      if (typeof translation !== 'string') {
        throw new Error(
          `Invalid glossary format: "${term}.${locale}" must be a string, got ${typeof translation}`,
        )
      }
    }
  }

  return parsed as GlossaryData
}

export function getGlossaryForLocale(
  glossary: GlossaryData,
  locale: string,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [term, mappings] of Object.entries(glossary)) {
    if (locale in mappings) {
      result[term] = mappings[locale]!
    }
  }
  return result
}

export function buildGlossaryPromptSection(terms: Record<string, string>): string {
  const entries = Object.entries(terms)
  if (entries.length === 0) {
    return ''
  }

  const sorted = [...entries].sort(([a], [b]) => a.localeCompare(b))
  const lines = sorted.map(([source, target]) => `"${source}" → "${target}"`)

  return `=== GLOSSARY (use these exact translations) ===\n${lines.join('\n')}`
}
