export interface ValidationResult {
  valid: boolean
  missingPlaceholders: string[]
  extraPlaceholders: string[]
  missingHtmlTags: string[]
  extraHtmlTags: string[]
  syntaxErrors: string[]
}

import { parse } from '@fluenti/core/internal'
import type { ASTNode } from '@fluenti/core/internal'

const ICU_PLURAL_SELECT_RE = /\{(\w+),\s*(plural|select|selectordinal)\s*,/

/** Extract unique ICU placeholder names from a message, sorted alphabetically.
 * Uses the ICU parser so only top-level variables are returned — select/plural case
 * body words (e.g. the `he`/`she` in `{g, select, male {he} other {she}}`) are not
 * mistakenly treated as placeholder names. */
export function extractPlaceholders(message: string): string[] {
  try {
    const ast = parse(message)
    const seen = new Set<string>()
    collectVariableNames(ast, seen)
    return [...seen].sort()
  } catch {
    // Fallback for unparseable messages: extract only top-level {word} patterns
    const seen = new Set<string>()
    // Match {word} at depth 0 — skip nested braces inside plural/select case bodies
    let depth = 0
    let i = 0
    while (i < message.length) {
      if (message[i] === '{') {
        depth++
        if (depth === 1) {
          const end = message.indexOf('}', i + 1)
          if (end !== -1) {
            const inner = message.slice(i + 1, end).trim()
            const nameMatch = /^(\w+)/.exec(inner)
            if (nameMatch) seen.add(nameMatch[1]!)
          }
        }
      } else if (message[i] === '}') {
        depth--
      }
      i++
    }
    return [...seen].sort()
  }
}

function collectVariableNames(nodes: ASTNode[], seen: Set<string>): void {
  for (const node of nodes) {
    if (node.type === 'variable' && node.name !== '#') {
      seen.add(node.name)
    } else if (node.type === 'plural' || node.type === 'select') {
      seen.add(node.variable)
      for (const branch of Object.values(node.options)) {
        collectVariableNames(branch, seen)
      }
    } else if (node.type === 'function') {
      seen.add(node.variable)
    }
  }
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
