import { describe, it, expect } from 'vitest'
import { buildTranslatePrompt } from '../src/translate-prompt'

describe('buildTranslatePrompt', () => {
  it('includes source and target locale', () => {
    const result = buildTranslatePrompt({
      sourceLocale: 'en',
      targetLocale: 'ja',
      messages: { greeting: 'Hello' },
    })
    expect(result).toContain('"en"')
    expect(result).toContain('"ja"')
  })

  it('includes messages as JSON', () => {
    const result = buildTranslatePrompt({
      sourceLocale: 'en',
      targetLocale: 'fr',
      messages: { greeting: 'Hello', farewell: 'Goodbye' },
    })
    expect(result).toContain('"greeting": "Hello"')
    expect(result).toContain('"farewell": "Goodbye"')
  })

  it('includes numbered translation rules', () => {
    const result = buildTranslatePrompt({
      sourceLocale: 'en',
      targetLocale: 'de',
      messages: { key: 'value' },
    })
    expect(result).toContain('1. Output ONLY')
    expect(result).toContain('2. Keep ICU MessageFormat')
    expect(result).toContain('3. Keep HTML tags')
    expect(result).toContain('4. Keep numbered rich-text tags')
    expect(result).toContain('5. Do not add')
  })

  it('includes glossary section when glossary provided', () => {
    const result = buildTranslatePrompt({
      sourceLocale: 'en',
      targetLocale: 'ja',
      messages: { greeting: 'Hello' },
      glossary: { workspace: 'ワークスペース', dashboard: 'ダッシュボード' },
    })
    expect(result).toContain('GLOSSARY')
    expect(result).toContain('"workspace"')
    expect(result).toContain('ワークスペース')
  })

  it('omits glossary section when glossary is empty', () => {
    const result = buildTranslatePrompt({
      sourceLocale: 'en',
      targetLocale: 'ja',
      messages: { greeting: 'Hello' },
      glossary: {},
    })
    expect(result).not.toContain('GLOSSARY')
  })

  it('omits glossary section when glossary is undefined', () => {
    const result = buildTranslatePrompt({
      sourceLocale: 'en',
      targetLocale: 'ja',
      messages: { greeting: 'Hello' },
    })
    expect(result).not.toContain('GLOSSARY')
  })

  it('includes context when provided', () => {
    const result = buildTranslatePrompt({
      sourceLocale: 'en',
      targetLocale: 'ja',
      messages: { greeting: 'Hello' },
      context: 'E-commerce application for fashion retail',
    })
    expect(result).toContain('PROJECT CONTEXT')
    expect(result).toContain('E-commerce application for fashion retail')
  })

  it('omits context when not provided', () => {
    const result = buildTranslatePrompt({
      sourceLocale: 'en',
      targetLocale: 'ja',
      messages: { greeting: 'Hello' },
    })
    expect(result).not.toContain('PROJECT CONTEXT')
  })

  it('includes both glossary and context when both provided', () => {
    const result = buildTranslatePrompt({
      sourceLocale: 'en',
      targetLocale: 'ja',
      messages: { greeting: 'Hello' },
      glossary: { save: '保存' },
      context: 'SaaS platform',
    })
    expect(result).toContain('GLOSSARY')
    expect(result).toContain('PROJECT CONTEXT')
    // Glossary should come before context
    const glossaryIndex = result.indexOf('GLOSSARY')
    const contextIndex = result.indexOf('PROJECT CONTEXT')
    expect(glossaryIndex).toBeLessThan(contextIndex)
  })
})
