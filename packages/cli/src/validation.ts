export interface ValidationResult {
  valid: boolean
  missingPlaceholders: string[]
  extraPlaceholders: string[]
  missingHtmlTags: string[]
  extraHtmlTags: string[]
  syntaxErrors: string[]
}

import { parse } from '@fluenti/core/internal'

const ICU_PLURAL_SELECT_RE = /\{(\w+),\s*(plural|select|selectordinal)\s*,/

/** Extract unique ICU placeholder names from a message, sorted alphabetically */
export function extractPlaceholders(message: string): string[] {
  const seen = new Set<string>()
  const regex = /\{(\w+)(?:\s*,\s*(?:plural|select|selectordinal|number|date|time))?/g
  let match
  while ((match = regex.exec(message)) !== null) {
    seen.add(match[1]!)
  }
  return [...seen].sort()
}

/** Extract unique HTML tag names from a message, lowercased and sorted */
export function extractHtmlTags(message: string): string[] {
  const seen = new Set<string>()
  const regex = /<\/?([a-zA-Z][\w-]*)[^>]*>/g
  let match
  while ((match = regex.exec(message)) !== null) {
    seen.add(match[1]!.toLowerCase())
  }
  return [...seen].sort()
}

/** Validate that a translation preserves placeholders and HTML tags from the source */
export function validateTranslation(source: string, translation: string): ValidationResult {
  const sourcePlaceholders = extractPlaceholders(source)
  const translationPlaceholders = extractPlaceholders(translation)
  const sourceHtmlTags = extractHtmlTags(source)
  const translationHtmlTags = extractHtmlTags(translation)

  const missingPlaceholders = sourcePlaceholders.filter(p => !translationPlaceholders.includes(p))
  const extraPlaceholders = translationPlaceholders.filter(p => !sourcePlaceholders.includes(p))
  const missingHtmlTags = sourceHtmlTags.filter(t => !translationHtmlTags.includes(t))
  const extraHtmlTags = translationHtmlTags.filter(t => !sourceHtmlTags.includes(t))

  const syntaxErrors: string[] = []
  if (ICU_PLURAL_SELECT_RE.test(translation)) {
    try {
      parse(translation)
    } catch (err) {
      syntaxErrors.push((err as Error).message)
    }
  }

  return {
    valid: missingPlaceholders.length === 0
      && extraPlaceholders.length === 0
      && missingHtmlTags.length === 0
      && extraHtmlTags.length === 0
      && syntaxErrors.length === 0,
    missingPlaceholders,
    extraPlaceholders,
    missingHtmlTags,
    extraHtmlTags,
    syntaxErrors,
  }
}

/** Validate a batch of translations, returning only invalid entries */
export function validateBatch(
  sources: Record<string, string>,
  translations: Record<string, string>,
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {}

  for (const key of Object.keys(sources)) {
    const translation = translations[key]
    if (translation === undefined) continue

    const result = validateTranslation(sources[key]!, translation)
    if (!result.valid) {
      results[key] = result
    }
  }

  return results
}
