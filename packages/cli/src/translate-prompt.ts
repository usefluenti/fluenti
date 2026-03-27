import { buildGlossaryPromptSection } from './glossary'

export interface PromptOptions {
  readonly sourceLocale: string
  readonly targetLocale: string
  readonly messages: Record<string, string>
  readonly glossary?: Record<string, string>
  readonly context?: string
}

export function buildTranslatePrompt(options: PromptOptions): string {
  const { sourceLocale, targetLocale, messages, glossary, context } = options
  const json = JSON.stringify(messages, null, 2)

  const sections: string[] = [
    `You are a professional translator. Translate the following messages from "${sourceLocale}" to "${targetLocale}".`,
    '',
    'Rules:',
    '1. Output ONLY a valid JSON object with the same keys and translated values.',
    '2. Keep ICU MessageFormat placeholders unchanged: {name}, {count, plural, ...}, {val, number}, etc.',
    '3. Keep HTML tags unchanged: <b>, <a href="...">, </span>, <br/>, etc.',
    '4. Keep numbered rich-text tags unchanged: <0>, </0>, <1/>, etc.',
    '5. Do not add any explanation, markdown formatting, or code fences — output raw JSON only.',
  ]

  if (glossary && Object.keys(glossary).length > 0) {
    const glossarySection = buildGlossaryPromptSection(glossary)
    if (glossarySection) {
      sections.push('', glossarySection)
    }
  }

  if (context) {
    sections.push('', `=== PROJECT CONTEXT ===`, context)
  }

  sections.push('', 'Input (JSON):', json)

  return sections.join('\n')
}
