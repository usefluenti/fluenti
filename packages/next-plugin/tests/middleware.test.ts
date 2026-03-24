import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createI18nMiddleware, LOCALE_HEADER } from '../src/middleware'

// ── Mock NextResponse ─────────────────────────────────────────────────────────

function makeResponse() {
  const headers = { set: vi.fn() }
  return { headers }
}

const mockNextResponse = {
  redirect: vi.fn(() => makeResponse()),
  rewrite: vi.fn(() => makeResponse()),
  next: vi.fn(() => makeResponse()),
}

// ── Mock NextRequest helper ───────────────────────────────────────────────────

function makeRequest(
  pathname: string,
  options: {
    search?: string
    cookie?: string
    acceptLanguage?: string
  } = {},
) {
  const headers = new Headers()
  if (options.acceptLanguage) headers.set('accept-language', options.acceptLanguage)

  return {
    nextUrl: { pathname, search: options.search ?? '' },
    url: `http://localhost${pathname}${options.search ?? ''}`,
    cookies: {
      get: (name: string) =>
        name === 'locale' && options.cookie
          ? { value: options.cookie }
          : undefined,
    },
    headers,
  }
}

const BASE_CONFIG = {
  locales: ['en', 'ja', 'zh-CN'],
  sourceLocale: 'en',
  NextResponse: mockNextResponse,
} as const

beforeEach(() => {
  vi.clearAllMocks()
  mockNextResponse.redirect.mockImplementation(() => makeResponse())
  mockNextResponse.rewrite.mockImplementation(() => makeResponse())
  mockNextResponse.next.mockImplementation(() => makeResponse())
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createI18nMiddleware', () => {
  it('returns a function', () => {
    const mw = createI18nMiddleware(BASE_CONFIG)
    expect(typeof mw).toBe('function')
  })

  describe('as-needed mode (default)', () => {
    it('redirects to /{locale}/path when no prefix and locale ≠ sourceLocale', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/about', { cookie: 'ja' })

      mw(req)

      expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
      expect(redirectUrl.pathname).toBe('/ja/about')
    })

    it('passes through when no prefix and locale === sourceLocale', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/about') // no cookie → defaults to 'en'

      mw(req)

      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
      expect(mockNextResponse.next).toHaveBeenCalledOnce()
    })

    it('rewrites to strip sourceLocale prefix (e.g. /en/about → /about)', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/en/about')

      mw(req)

      expect(mockNextResponse.rewrite).toHaveBeenCalledOnce()
      const rewriteUrl: URL = mockNextResponse.rewrite.mock.calls[0]![0]
      expect(rewriteUrl.pathname).toBe('/about')
    })

    it('passes through for non-source locale with correct prefix', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/ja/about')

      mw(req)

      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
      expect(mockNextResponse.next).toHaveBeenCalledOnce()
    })
  })

  describe('always mode', () => {
    it('redirects even when locale equals sourceLocale', () => {
      const mw = createI18nMiddleware({ ...BASE_CONFIG, localePrefix: 'always' })
      const req = makeRequest('/about') // no cookie → 'en'

      mw(req)

      expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
      expect(redirectUrl.pathname).toBe('/en/about')
    })

    it('passes through when locale is already prefixed', () => {
      const mw = createI18nMiddleware({ ...BASE_CONFIG, localePrefix: 'always' })
      const req = makeRequest('/en/about')

      mw(req)

      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(mockNextResponse.next).toHaveBeenCalledOnce()
    })
  })

  describe('LOCALE_HEADER', () => {
    it('sets x-fluenti-locale on redirect response', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/about', { cookie: 'ja' })
      const response = mw(req)

      expect(response.headers.set).toHaveBeenCalledWith(LOCALE_HEADER, 'ja')
    })

    it('sets x-fluenti-locale on rewrite response', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/en/about')
      const response = mw(req)

      expect(response.headers.set).toHaveBeenCalledWith(LOCALE_HEADER, 'en')
    })

    it('sets x-fluenti-locale on pass-through response', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/about') // source locale → pass-through
      const response = mw(req)

      expect(response.headers.set).toHaveBeenCalledWith(LOCALE_HEADER, 'en')
    })
  })

  describe('detectLocale', () => {
    it('prefers cookie over Accept-Language', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/about', {
        cookie: 'ja',
        acceptLanguage: 'zh-CN,zh;q=0.9',
      })

      mw(req)

      const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
      expect(redirectUrl.pathname).toBe('/ja/about')
    })

    it('falls back to Accept-Language when no cookie', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/about', { acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.8' })

      mw(req)

      expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
      expect(redirectUrl.pathname).toBe('/zh-CN/about')
    })

    it('matches Accept-Language prefix (en-US → en)', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/about', { acceptLanguage: 'en-US,en;q=0.9' })

      mw(req)

      // 'en' is sourceLocale — should pass through (no redirect)
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(mockNextResponse.next).toHaveBeenCalledOnce()
    })

    it('falls back to sourceLocale when no cookie and no matching Accept-Language', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/about', { acceptLanguage: 'de,fr;q=0.9' })

      mw(req)

      // sourceLocale 'en' → as-needed pass-through
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(mockNextResponse.next).toHaveBeenCalledOnce()
    })

    it('ignores cookie that is not in locales list', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/about', { cookie: 'fr' }) // fr not in locales

      mw(req)

      // falls through to default 'en' → pass-through
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(mockNextResponse.next).toHaveBeenCalledOnce()
    })

    it('respects custom cookieName', () => {
      const mw = createI18nMiddleware({
        ...BASE_CONFIG,
        cookieName: 'NEXT_LOCALE',
      })
      // Build a request with a custom-named cookie
      const req = {
        nextUrl: { pathname: '/about', search: '' },
        url: 'http://localhost/about',
        cookies: {
          get: (name: string) => (name === 'NEXT_LOCALE' ? { value: 'ja' } : undefined),
        },
        headers: new Headers(),
      }

      mw(req)

      expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
      expect(redirectUrl.pathname).toBe('/ja/about')
    })
  })

  describe('URL construction', () => {
    it('preserves search params on redirect', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/about', { cookie: 'ja', search: '?ref=home' })

      mw(req)

      const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
      expect(redirectUrl.search).toBe('?ref=home')
    })

    it('preserves search params on rewrite', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/en/about', { search: '?ref=home' })

      mw(req)

      const rewriteUrl: URL = mockNextResponse.rewrite.mock.calls[0]![0]
      expect(rewriteUrl.search).toBe('?ref=home')
    })

    it('handles root path redirect', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/', { cookie: 'ja' })

      mw(req)

      expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
      expect(redirectUrl.pathname).toBe('/ja/')
    })
  })

  it('exports LOCALE_HEADER constant', () => {
    expect(LOCALE_HEADER).toBe('x-fluenti-locale')
  })
})
