import { readFileSync, existsSync, statSync } from 'node:fs'

export type GlossaryData = Record<string, Record<string, string>>

const MAX_GLOSSARY_SIZE = 1_048_576 // 1MB

export function loadGlossary(glossaryPath: string): GlossaryData {
  if (!existsSync(glossaryPath)) {
    return {}
  }

  const fileSize = statSync(glossaryPath).size
  if (fileSize > MAX_GLOSSARY_SIZE) {
    throw new Error(
      `Glossary file exceeds maximum size of ${MAX_GLOSSARY_SIZE} bytes (got ${fileSize} bytes)`,
    )
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

/** Escape control characters and quotes to prevent prompt injection in AI prompts */
function sanitizePromptValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\n\r]/g, ' ')
    .replace(/\t/g, ' ')
}

export function buildGlossaryPromptSection(terms: Record<string, string>): string {
  const entries = Object.entries(terms)
  if (entries.length === 0) {
    return ''
  }

  const sorted = [...entries].sort(([a], [b]) => a.localeCompare(b))
  const lines = sorted.map(([source, target]) => `"${sanitizePromptValue(source)}" → "${sanitizePromptValue(target)}"`)

  return `=== GLOSSARY (use these exact translations) ===\n${lines.join('\n')}`
}
