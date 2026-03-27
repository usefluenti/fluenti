import { describe, it, expect } from 'vitest'
import { parseTranslateResponse } from '../src/translate-parse'

describe('parseTranslateResponse', () => {
  const sourceMessages = {
    greeting: 'Hello {name}',
    farewell: 'Goodbye',
    tagged: 'Click <b>here</b>',
  }

  describe('JSON extraction', () => {
    it('parses plain JSON response', () => {
      const response = '{"greeting": "こんにちは {name}", "farewell": "さようなら", "tagged": "<b>ここ</b>をクリック"}'
      const result = parseTranslateResponse(response, sourceMessages)
      expect(result.translations).toEqual({
        greeting: 'こんにちは {name}',
        farewell: 'さようなら',
        tagged: '<b>ここ</b>をクリック',
      })
    })

    it('parses JSON wrapped in markdown code fence', () => {
      const response = '```json\n{"greeting": "Bonjour {name}", "farewell": "Au revoir", "tagged": "Cliquez <b>ici</b>"}\n```'
      const result = parseTranslateResponse(response, sourceMessages)
      expect(result.translations.greeting).toBe('Bonjour {name}')
    })

    it('parses JSON wrapped in plain code fence', () => {
      const response = '```\n{"greeting": "Hola {name}", "farewell": "Adiós", "tagged": "Haz clic <b>aquí</b>"}\n```'
      const result = parseTranslateResponse(response, sourceMessages)
      expect(result.translations.greeting).toBe('Hola {name}')
    })

    it('parses JSON surrounded by extra text', () => {
      const response = 'Here is the translation:\n{"greeting": "Bonjour {name}", "farewell": "Au revoir", "tagged": "Cliquez <b>ici</b>"}\nDone.'
      const result = parseTranslateResponse(response, sourceMessages)
      expect(result.translations.farewell).toBe('Au revoir')
    })

    it('extracts only the first JSON object when multiple present', () => {
      const response = '{"greeting": "Bonjour {name}", "farewell": "Au revoir", "tagged": "Cliquez <b>ici</b>"} and {"other": "data"}'
      const result = parseTranslateResponse(response, sourceMessages)
      expect(result.translations.greeting).toBe('Bonjour {name}')
      expect(result.translations).not.toHaveProperty('other')
    })

    it('handles escaped quotes in JSON values', () => {
      const source = { msg: 'He said "hello"' }
      const response = '{"msg": "Il a dit \\"bonjour\\""}'
      const result = parseTranslateResponse(response, source)
      expect(result.translations.msg).toBe('Il a dit "bonjour"')
    })

    it('throws on no JSON object found', () => {
      expect(() => parseTranslateResponse('no json here', sourceMessages)).toThrow('No JSON object found')
    })

    it('throws on invalid JSON syntax', () => {
      expect(() => parseTranslateResponse('{broken json}', sourceMessages)).toThrow()
    })

    it('throws on unterminated JSON object', () => {
      expect(() => parseTranslateResponse('{"key": "value"', sourceMessages)).toThrow('Unterminated')
    })

    it('throws when response is JSON array', () => {
      expect(() => parseTranslateResponse('[1, 2, 3]', sourceMessages)).toThrow('No JSON object found')
    })
  })

  describe('QA validation', () => {
    it('warns on missing placeholder in translation', () => {
      const source = { msg: 'Hello {name}' }
      const response = '{"msg": "Bonjour"}'
      const result = parseTranslateResponse(response, source)
      expect(result.translations.msg).toBe('Bonjour')
      expect(result.warnings).toContainEqual(expect.stringContaining('missing placeholders'))
      expect(result.warnings).toContainEqual(expect.stringContaining('name'))
    })

    it('warns on extra placeholder in translation', () => {
      const source = { msg: 'Hello' }
      const response = '{"msg": "Bonjour {extra}"}'
      const result = parseTranslateResponse(response, source)
      expect(result.translations.msg).toBe('Bonjour {extra}')
      expect(result.warnings).toContainEqual(expect.stringContaining('extra placeholders'))
    })

    it('warns on missing HTML tag in translation', () => {
      const source = { msg: 'Click <b>here</b>' }
      const response = '{"msg": "Cliquez ici"}'
      const result = parseTranslateResponse(response, source)
      expect(result.translations.msg).toBe('Cliquez ici')
      expect(result.warnings).toContainEqual(expect.stringContaining('missing HTML tags'))
    })

    it('preserves translation even when QA fails', () => {
      const source = { msg: 'Hello {name}' }
      const response = '{"msg": "Bonjour"}'
      const result = parseTranslateResponse(response, source)
      // Translation should be kept despite QA warning
      expect(result.translations.msg).toBe('Bonjour')
    })

    it('produces no warnings when translation is correct', () => {
      const source = { msg: 'Hello {name}' }
      const response = '{"msg": "Bonjour {name}"}'
      const result = parseTranslateResponse(response, source)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('key validation', () => {
    it('warns on missing keys from AI response', () => {
      const source = { a: 'Hello', b: 'World' }
      const response = '{"a": "Bonjour"}'
      const result = parseTranslateResponse(response, source)
      expect(result.warnings).toContainEqual(expect.stringContaining('Missing translation for key: "b"'))
    })

    it('warns on and ignores extra keys in AI response', () => {
      const source = { a: 'Hello' }
      const response = '{"a": "Bonjour", "extra": "Ignoré"}'
      const result = parseTranslateResponse(response, source)
      expect(result.translations).not.toHaveProperty('extra')
      expect(result.warnings).toContainEqual(expect.stringContaining('Extra key'))
    })

    it('warns on and ignores non-string values', () => {
      const source = { a: 'Hello', b: 'World' }
      const response = '{"a": "Bonjour", "b": 123}'
      const result = parseTranslateResponse(response, source)
      expect(result.translations).not.toHaveProperty('b')
      expect(result.warnings).toContainEqual(expect.stringContaining('Non-string value'))
    })
  })

  describe('escape sequence edge cases', () => {
    it('handles escaped backslash before closing quote', () => {
      const source = { msg: 'test' }
      const response = '{"msg": "value with \\\\"}'
      const result = parseTranslateResponse(response, source)
      expect(result.translations.msg).toBe('value with \\')
    })

    it('handles escaped newline in value', () => {
      const source = { msg: 'line1' }
      const response = '{"msg": "line1\\nline2"}'
      const result = parseTranslateResponse(response, source)
      expect(result.translations.msg).toBe('line1\nline2')
    })

    it('handles ICU placeholders in braces within JSON string', () => {
      const source = { msg: 'Hello {name}' }
      const response = '{"msg": "こんにちは {name}"}'
      const result = parseTranslateResponse(response, source)
      expect(result.translations.msg).toBe('こんにちは {name}')
      expect(result.warnings).toHaveLength(0)
    })

    it('handles unicode escape sequences', () => {
      const source = { msg: 'test' }
      const response = '{"msg": "\\u3053\\u3093\\u306b\\u3061\\u306f"}'
      const result = parseTranslateResponse(response, source)
      expect(result.translations.msg).toBe('こんにちは')
    })

    it('handles nested braces in JSON string values', () => {
      const source = { msg: '{count, plural, one {# item} other {# items}}' }
      const response = '{"msg": "{count, plural, one {# アイテム} other {# アイテム}}"}'
      const result = parseTranslateResponse(response, source)
      expect(result.translations.msg).toBe('{count, plural, one {# アイテム} other {# アイテム}}')
    })

    it('handles empty string translation', () => {
      const source = { msg: 'Hello' }
      const response = '{"msg": ""}'
      const result = parseTranslateResponse(response, source)
      expect(result.translations.msg).toBe('')
    })
  })
})
