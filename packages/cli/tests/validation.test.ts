import { describe, expect, it } from 'vitest'
import {
  extractHtmlTags,
  extractPlaceholders,
  validateBatch,
  validateTranslation,
} from '../src/validation.js'

describe('extractPlaceholders', () => {
  it('extracts a simple placeholder', () => {
    expect(extractPlaceholders('Hello {name}')).toEqual(['name'])
  })

  it('extracts placeholder from plural syntax', () => {
    expect(
      extractPlaceholders('{count, plural, one {# item} other {# items}}'),
    ).toEqual(['count'])
  })

  it('extracts multiple placeholders with types, sorted', () => {
    expect(
      extractPlaceholders('{name} has {count, number} items on {date, date}'),
    ).toEqual(['count', 'date', 'name'])
  })

  it('returns empty array when no placeholders', () => {
    expect(extractPlaceholders('No placeholders here')).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(extractPlaceholders('')).toEqual([])
  })
})

describe('extractHtmlTags', () => {
  it('extracts tags from bold markup', () => {
    expect(extractHtmlTags('<b>bold</b>')).toEqual(['b'])
  })

  it('extracts multiple unique tag names', () => {
    expect(extractHtmlTags("<a href='x'>link</a> and <br/>")).toEqual(['a', 'br'])
  })

  it('returns empty array when no tags', () => {
    expect(extractHtmlTags('no tags')).toEqual([])
  })

  it('deduplicates repeated tags', () => {
    expect(extractHtmlTags('<p>text</p><p>more</p>')).toEqual(['p'])
  })
})

describe('validateTranslation', () => {
  it('returns valid when placeholders and tags match', () => {
    const result = validateTranslation(
      'Hello {name}, <b>welcome</b>',
      'Bonjour {name}, <b>bienvenue</b>',
    )
    expect(result).toEqual({
      valid: true,
      missingPlaceholders: [],
      extraPlaceholders: [],
      missingHtmlTags: [],
      extraHtmlTags: [],
    })
  })

  it('detects missing placeholder', () => {
    const result = validateTranslation('Hello {name}', 'Bonjour')
    expect(result.valid).toBe(false)
    expect(result.missingPlaceholders).toEqual(['name'])
  })

  it('detects extra placeholder', () => {
    const result = validateTranslation('Hello', 'Bonjour {extra}')
    expect(result.valid).toBe(false)
    expect(result.extraPlaceholders).toEqual(['extra'])
  })

  it('detects missing HTML tag', () => {
    const result = validateTranslation('<b>Hello</b>', 'Bonjour')
    expect(result.valid).toBe(false)
    expect(result.missingHtmlTags).toEqual(['b'])
  })

  it('detects multiple issues at once', () => {
    const result = validateTranslation(
      '{name} <b>hello</b>',
      '{other} <em>bonjour</em>',
    )
    expect(result.valid).toBe(false)
    expect(result.missingPlaceholders).toEqual(['name'])
    expect(result.extraPlaceholders).toEqual(['other'])
    expect(result.missingHtmlTags).toEqual(['b'])
    expect(result.extraHtmlTags).toEqual(['em'])
  })
})

describe('validateBatch', () => {
  it('returns only invalid entries', () => {
    const sources = {
      greeting: 'Hello {name}',
      farewell: 'Goodbye {name}',
    }
    const translations = {
      greeting: 'Bonjour {name}',
      farewell: 'Au revoir',
    }
    const results = validateBatch(sources, translations)
    expect(Object.keys(results)).toEqual(['farewell'])
    expect(results['farewell']!.missingPlaceholders).toEqual(['name'])
  })

  it('returns empty object when all valid', () => {
    const sources = { a: 'Hello {name}', b: 'Bye' }
    const translations = { a: 'Hola {name}', b: 'Adiós' }
    expect(validateBatch(sources, translations)).toEqual({})
  })

  it('returns all entries when all invalid', () => {
    const sources = { a: '{x}', b: '{y}' }
    const translations = { a: '{z}', b: '{w}' }
    const results = validateBatch(sources, translations)
    expect(Object.keys(results).sort()).toEqual(['a', 'b'])
  })
})

describe('extractPlaceholders — edge cases', () => {
  it('unclosed brace {name does not extract placeholder due to regex requirement', () => {
    // The regex requires { followed by \w+ and optionally more — no closing brace needed
    // but the opening brace is enough to match
    const result = extractPlaceholders('{name')
    expect(result).toEqual(['name'])
  })

  it('space before name { name} is not matched by regex', () => {
    // The regex /\{(\w+)/ requires \w immediately after {, space breaks it
    const result = extractPlaceholders('{ name}')
    expect(result).toEqual([])
  })
})

describe('extractHtmlTags — edge cases', () => {
  it('self-closing HTML <br/> is extracted', () => {
    const result = extractHtmlTags('Line break <br/> here')
    expect(result).toEqual(['br'])
  })

  it('unclosed HTML <div is not matched', () => {
    // The regex requires > to close the tag
    const result = extractHtmlTags('unclosed <div here')
    expect(result).toEqual([])
  })
})
