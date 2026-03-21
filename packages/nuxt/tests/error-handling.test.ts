import { describe, it, expect } from 'vitest'
import type { I18nError, I18nErrorHandler, MessageFallbackHandler } from '../src/types'

describe('Structured error handling types', () => {
  it('I18nError has correct structure', () => {
    const error: I18nError = {
      code: 'MISSING_MESSAGE',
      message: 'Missing translation for "greeting" in locale "ja"',
      key: 'greeting',
      locale: 'ja',
    }

    expect(error.code).toBe('MISSING_MESSAGE')
    expect(error.key).toBe('greeting')
    expect(error.locale).toBe('ja')
    expect(error.message).toContain('Missing translation')
  })

  it('I18nErrorHandler callback works', () => {
    const errors: I18nError[] = []
    const handler: I18nErrorHandler = (error) => {
      errors.push(error)
    }

    handler({
      code: 'MISSING_MESSAGE',
      message: 'test',
      key: 'hello',
      locale: 'ja',
    })

    expect(errors).toHaveLength(1)
    expect(errors[0]!.code).toBe('MISSING_MESSAGE')
  })

  it('MessageFallbackHandler returns fallback string', () => {
    const fallback: MessageFallbackHandler = (error) => {
      if (error.code === 'MISSING_MESSAGE') {
        return `[${error.key}]`
      }
      return undefined
    }

    expect(fallback({ code: 'MISSING_MESSAGE', message: 'test', key: 'hello' })).toBe('[hello]')
    expect(fallback({ code: 'FORMAT_ERROR', message: 'test' })).toBeUndefined()
  })

  it('supports all error codes', () => {
    const codes: I18nError['code'][] = [
      'MISSING_MESSAGE',
      'MISSING_LOCALE',
      'FORMAT_ERROR',
      'LOAD_ERROR',
    ]

    for (const code of codes) {
      const error: I18nError = { code, message: `Error: ${code}` }
      expect(error.code).toBe(code)
    }
  })

  it('supports cause field for wrapping errors', () => {
    const cause = new Error('Network failure')
    const error: I18nError = {
      code: 'LOAD_ERROR',
      message: 'Failed to load locale "ja"',
      locale: 'ja',
      cause,
    }

    expect(error.cause).toBe(cause)
  })
})
