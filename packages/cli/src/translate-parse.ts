import { validateTranslation } from './validation'

export interface ParseResult {
  readonly translations: Record<string, string>
  readonly warnings: string[]
}

/**
 * Extract the first complete JSON object from text using bracket counting.
 * Handles strings with escaped characters correctly.
 */
function extractFirstJsonObject(text: string): string {
  const start = text.indexOf('{')
  if (start === -1) {
    throw new Error('No JSON object found in AI response')
  }
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"' && !escape) { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  throw new Error('Unterminated JSON object in AI response')
}

/**
 * Strip markdown code fences from AI response.
 * Handles ```json ... ``` and ``` ... ``` patterns.
 */
function stripCodeFence(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
  return fenceMatch ? fenceMatch[1]! : text
}

/**
 * Parse AI translation response and validate against source messages.
 * Returns translations with warnings for any QA issues.
 */
export function parseTranslateResponse(
  response: string,
  sourceMessages: Record<string, string>,
): ParseResult {
  const warnings: string[] = []

  // Step 1: Strip markdown code fence if present
  const cleaned = stripCodeFence(response)

  // Step 2: Extract first JSON object using bracket counting
  const jsonStr = extractFirstJsonObject(cleaned)

  // Step 3: Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error(`Failed to parse JSON from AI response: ${jsonStr.slice(0, 200)}`)
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('AI response is not a valid JSON object')
  }

  const rawTranslations = parsed as Record<string, unknown>
  const translations: Record<string, string> = {}
  const sourceKeys = new Set(Object.keys(sourceMessages))

  // Step 4: Validate each key
  for (const [key, value] of Object.entries(rawTranslations)) {
    // Skip keys not in source
    if (!sourceKeys.has(key)) {
      warnings.push(`Extra key in AI response (ignored): "${key}"`)
      continue
    }

    // Must be a string value
    if (typeof value !== 'string') {
      warnings.push(`Non-string value for key "${key}" (ignored)`)
      continue
    }

    translations[key] = value

    // QA validation: check placeholder and HTML tag consistency
    const source = sourceMessages[key]!
    const validation = validateTranslation(source, value)
    if (!validation.valid) {
      const issues: string[] = []
      if (validation.missingPlaceholders.length > 0) {
        issues.push(`missing placeholders: ${validation.missingPlaceholders.join(', ')}`)
      }
      if (validation.extraPlaceholders.length > 0) {
        issues.push(`extra placeholders: ${validation.extraPlaceholders.join(', ')}`)
      }
      if (validation.missingHtmlTags.length > 0) {
        issues.push(`missing HTML tags: ${validation.missingHtmlTags.join(', ')}`)
      }
      if (validation.extraHtmlTags.length > 0) {
        issues.push(`extra HTML tags: ${validation.extraHtmlTags.join(', ')}`)
      }
      if (validation.syntaxErrors.length > 0) {
        issues.push(`ICU syntax errors: ${validation.syntaxErrors.join('; ')}`)
      }
      warnings.push(`QA issue for "${key}": ${issues.join('; ')}`)
    }
  }

  // Step 5: Check for missing keys
  for (const key of sourceKeys) {
    if (!(key in translations)) {
      warnings.push(`Missing translation for key: "${key}"`)
    }
  }

  return { translations, warnings }
}
