import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock react.cache to return a memoized version (simulates request scope)
vi.mock('react', () => ({
  cache: (fn: () => unknown) => {
    let cached: unknown
    return () => {
      if (cached === undefined) cached = fn()
      return cached
    }
  },
}))

// Mock next/headers to simulate no headers available
vi.mock('next/headers', () => ({
  headers: () => { throw new Error('headers() not available') },
}))

describe('server utilities', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('generateLocaleParams', () => {
    it('returns array of { locale } objects', async () => {
      const { generateLocaleParams } = await import('../src/server')
      expect(generateLocaleParams(['en', 'ja', 'zh-CN'])).toEqual([
        { locale: 'en' },
        { locale: 'ja' },
        { locale: 'zh-CN' },
      ])
    })

    it('returns empty array for empty input', async () => {
      const { generateLocaleParams } = await import('../src/server')
      expect(generateLocaleParams([])).toEqual([])
    })
  })

  describe('setRequestLocale + getLocale', () => {
    it('getLocale returns locale set by setRequestLocale', async () => {
      const { setRequestLocale, getLocale } = await import('../src/server')
      setRequestLocale('ja')
      expect(await getLocale()).toBe('ja')
    })

    it('getLocale returns "en" when nothing set and no headers', async () => {
      const { getLocale } = await import('../src/server')
      // React.cache is mocked as identity, so store starts fresh
      // next/headers throws, so fallback to 'en'
      expect(await getLocale()).toBe('en')
    })
  })
})
