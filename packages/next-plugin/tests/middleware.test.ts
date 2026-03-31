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

const RDL_CONFIG = {
  locales: ['en', 'ja', 'zh-CN'],
  sourceLocale: 'en',
  rewriteDefaultLocale: true,
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

    it('normalizes double slashes when stripping source locale prefix (e.g. /en//page → /page)', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/en//page')

      mw(req)

      expect(mockNextResponse.rewrite).toHaveBeenCalledOnce()
      const rewriteUrl: URL = mockNextResponse.rewrite.mock.calls[0]![0]
      expect(rewriteUrl.pathname).toBe('/page')
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

  describe('rewriteDefaultLocale', () => {
    const RDL_CONFIG = { ...BASE_CONFIG, rewriteDefaultLocale: true } as const

    describe('basic rewrite', () => {
      it('rewrites root path / to /en/ (preserves trailing slash for trailingSlash:true compat)', () => {
        const mw = createI18nMiddleware(RDL_CONFIG)
        const req = makeRequest('/')

        mw(req)

        expect(mockNextResponse.rewrite).toHaveBeenCalledOnce()
        const rewriteUrl: URL = mockNextResponse.rewrite.mock.calls[0]![0]
        // pathname='/' → rewritePath='/en/' preserving trailing slash
        expect(rewriteUrl.pathname).toBe('/en/')
      })

      it('rewrites /about to /en/about', () => {
        const mw = createI18nMiddleware(RDL_CONFIG)
        const req = makeRequest('/about')

        mw(req)

        expect(mockNextResponse.rewrite).toHaveBeenCalledOnce()
        const rewriteUrl: URL = mockNextResponse.rewrite.mock.calls[0]![0]
        expect(rewriteUrl.pathname).toBe('/en/about')
      })

      it('preserves search params on rewrite', () => {
        const mw = createI18nMiddleware(RDL_CONFIG)
        const req = makeRequest('/about', { search: '?ref=home' })

        mw(req)

        const rewriteUrl: URL = mockNextResponse.rewrite.mock.calls[0]![0]
        expect(rewriteUrl.pathname).toBe('/en/about')
        expect(rewriteUrl.search).toBe('?ref=home')
      })

      it('sets x-fluenti-locale on the rewrite response', () => {
        const mw = createI18nMiddleware(RDL_CONFIG)
        const req = makeRequest('/about')
        const response = mw(req)

        expect(response.headers.set).toHaveBeenCalledWith(LOCALE_HEADER, 'en')
        expect(mockNextResponse.rewrite).toHaveBeenCalledOnce()
      })
    })

    describe('Case 3 changes to redirect when rewriteDefaultLocale=true', () => {
      it('redirects /en/about to /about (not rewrite)', () => {
        const mw = createI18nMiddleware(RDL_CONFIG)
        const req = makeRequest('/en/about')

        mw(req)

        expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
        expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
        const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
        expect(redirectUrl.pathname).toBe('/about')
      })

      it('redirects /en to / (not rewrite)', () => {
        const mw = createI18nMiddleware(RDL_CONFIG)
        const req = makeRequest('/en')

        mw(req)

        expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
        expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
        const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
        expect(redirectUrl.pathname).toBe('/')
      })
    })

    describe('backward compatibility (rewriteDefaultLocale=false, default)', () => {
      it('does not rewrite /about when rewriteDefaultLocale is not set', () => {
        const mw = createI18nMiddleware(BASE_CONFIG)
        const req = makeRequest('/about')

        mw(req)

        expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
        expect(mockNextResponse.next).toHaveBeenCalledOnce()
      })

      it('still rewrites /en/about to /about (not redirect) by default', () => {
        const mw = createI18nMiddleware(BASE_CONFIG)
        const req = makeRequest('/en/about')

        mw(req)

        expect(mockNextResponse.rewrite).toHaveBeenCalledOnce()
        expect(mockNextResponse.redirect).not.toHaveBeenCalled()
        const rewriteUrl: URL = mockNextResponse.rewrite.mock.calls[0]![0]
        expect(rewriteUrl.pathname).toBe('/about')
      })
    })

    describe('cross-case interactions', () => {
      it('still redirects non-source locale even when rewriteDefaultLocale=true', () => {
        const mw = createI18nMiddleware(RDL_CONFIG)
        const req = makeRequest('/about', { cookie: 'ja' })

        mw(req)

        expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
        const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
        expect(redirectUrl.pathname).toBe('/ja/about')
      })

      it('passthrough for non-source locale with prefix is unchanged', () => {
        const mw = createI18nMiddleware(RDL_CONFIG)
        const req = makeRequest('/ja/about')

        mw(req)

        expect(mockNextResponse.redirect).not.toHaveBeenCalled()
        expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
        expect(mockNextResponse.next).toHaveBeenCalledOnce()
      })
    })

    describe('custom detectLocale option', () => {
      it('uses result of custom detectLocale when locale is in list', () => {
        const mw = createI18nMiddleware({
          ...BASE_CONFIG,
          detectLocale: () => 'ja',
        })
        const req = makeRequest('/about') // no cookie, no Accept-Language

        mw(req)

        // locale='ja' ≠ sourceLocale → Case 1 redirect to /ja/about
        expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
        const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
        expect(redirectUrl.pathname).toBe('/ja/about')
      })

      it('falls through to built-in detection when custom returns undefined', () => {
        const mw = createI18nMiddleware({
          ...BASE_CONFIG,
          detectLocale: () => undefined,
        })
        const req = makeRequest('/about', { cookie: 'ja' })

        mw(req)

        // built-in picks up cookie → redirect /ja/about
        expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
        const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
        expect(redirectUrl.pathname).toBe('/ja/about')
      })

      it('ignores custom result when returned locale is not in locales list', () => {
        const mw = createI18nMiddleware({
          ...BASE_CONFIG,
          detectLocale: () => 'fr', // not in ['en', 'ja', 'zh-CN']
        })
        const req = makeRequest('/about', { cookie: 'ja' })

        mw(req)

        // falls through to built-in → cookie wins
        expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
        const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
        expect(redirectUrl.pathname).toBe('/ja/about')
      })

      it('custom detectLocale takes priority over cookie', () => {
        const mw = createI18nMiddleware({
          ...BASE_CONFIG,
          detectLocale: () => 'zh-CN',
        })
        const req = makeRequest('/about', { cookie: 'ja' })

        mw(req)

        // custom 'zh-CN' wins over cookie 'ja'
        expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
        const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
        expect(redirectUrl.pathname).toBe('/zh-CN/about')
      })

      it('custom detectLocale receives the request object', () => {
        const spy = vi.fn(() => undefined)
        const mw = createI18nMiddleware({ ...BASE_CONFIG, detectLocale: spy })
        const req = makeRequest('/about')

        mw(req)

        expect(spy).toHaveBeenCalledOnce()
        expect(spy).toHaveBeenCalledWith(req)
      })

      it('custom detectLocale is not called when locale is in the URL path', () => {
        const spy = vi.fn(() => 'zh-CN')
        const mw = createI18nMiddleware({ ...BASE_CONFIG, detectLocale: spy })
        const req = makeRequest('/ja/about')

        mw(req)

        // path locale 'ja' already determined — custom fn not needed
        expect(spy).not.toHaveBeenCalled()
      })
    })

    describe('mode compatibility', () => {
      it('always mode is unaffected by rewriteDefaultLocale', () => {
        const mw = createI18nMiddleware({ ...RDL_CONFIG, localePrefix: 'always' })
        const req = makeRequest('/about') // no cookie → 'en'

        mw(req)

        // always mode redirects regardless — rewriteDefaultLocale has no effect
        expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
        const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
        expect(redirectUrl.pathname).toBe('/en/about')
        expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
      })
    })
  })

  // ── basePath support ──────────────────────────────────────────────────────────

  describe('basePath support', () => {
    function makeRequestWithBasePath(pathname: string, basePath: string, options: Parameters<typeof makeRequest>[1] = {}) {
      const req = makeRequest(pathname, options)
      return { ...req, nextUrl: { ...req.nextUrl, basePath } }
    }

    it('prepends basePath to redirect URL', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequestWithBasePath('/about', '/app', { cookie: 'ja' })

      mw(req)

      expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
      expect(redirectUrl.pathname).toBe('/app/ja/about')
    })

    it('prepends basePath to rewrite URL (rewriteDefaultLocale)', () => {
      const mw = createI18nMiddleware(RDL_CONFIG)
      const req = makeRequestWithBasePath('/about', '/app')

      mw(req)

      expect(mockNextResponse.rewrite).toHaveBeenCalledOnce()
      const rewriteUrl: URL = mockNextResponse.rewrite.mock.calls[0]![0]
      expect(rewriteUrl.pathname).toBe('/app/en/about')
    })

    it('prepends basePath when stripping source locale prefix', () => {
      const mw = createI18nMiddleware(RDL_CONFIG)
      const req = makeRequestWithBasePath('/en/about', '/app')

      mw(req)

      // Case 3: redirect from /app/en/about to /app/about
      expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
      expect(redirectUrl.pathname).toBe('/app/about')
    })

    it('no basePath (default): URL construction unchanged', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/about', { cookie: 'ja' })

      mw(req)

      const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
      expect(redirectUrl.pathname).toBe('/ja/about')
    })
  })

  // ── case-insensitive locale matching ─────────────────────────────────────────

  describe('case-insensitive locale matching', () => {
    it('URL path /ZH-CN/about matches zh-CN', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/ZH-CN/about')

      mw(req)

      // pathLocale found (case-insensitive) → pass through with correct locale header
      expect(mockNextResponse.next).toHaveBeenCalledOnce()
      const [[init]] = mockNextResponse.next.mock.calls as [[{ request: { headers: Headers } }]]
      expect(init.request.headers.get('x-fluenti-locale')).toBe('zh-CN')
    })

    it('cookie locale zh-cn (lowercase) matches zh-CN', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/about', { cookie: 'zh-cn' })

      mw(req)

      // zh-cn → zh-CN → non-source locale → Case 1 redirect to /zh-CN/about
      expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
      expect(redirectUrl.pathname).toBe('/zh-CN/about')
    })

    it('Accept-Language zh-CN (mixed case) matches zh-CN', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      const req = makeRequest('/about', { acceptLanguage: 'zh-CN,en;q=0.8' })

      mw(req)

      expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl: URL = mockNextResponse.redirect.mock.calls[0]![0]
      expect(redirectUrl.pathname).toBe('/zh-CN/about')
    })
  })

  // ── setCookie option ─────────────────────────────────────────────────────────

  describe('setCookie option', () => {
    it('does not set cookie by default', () => {
      const mw = createI18nMiddleware({ ...BASE_CONFIG, setCookie: false })
      const req = makeRequest('/about', { acceptLanguage: 'ja' })

      const res = mw(req)

      expect((res as any).headers.set).not.toHaveBeenCalledWith(
        'set-cookie',
        expect.any(String),
      )
    })

    it('sets cookie when setCookie: true and locale was detected (no cookie)', () => {
      const mw = createI18nMiddleware({ ...BASE_CONFIG, setCookie: true })
      const req = makeRequest('/about', { acceptLanguage: 'ja' })

      mw(req)

      expect(mockNextResponse.redirect).toHaveBeenCalledOnce()
      const res = mockNextResponse.redirect.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      const setCookieCall = res.headers.set.mock.calls.find(([name]) => name === 'set-cookie')
      expect(setCookieCall).toBeTruthy()
      expect(setCookieCall![1]).toContain('locale=ja')
    })

    it('does not set cookie when locale already in cookie', () => {
      const mw = createI18nMiddleware({ ...BASE_CONFIG, setCookie: true })
      const req = makeRequest('/about', { cookie: 'ja' })

      mw(req)

      const res = mockNextResponse.redirect.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      const setCookieCall = res.headers.set.mock.calls.find(([name]) => name === 'set-cookie')
      expect(setCookieCall).toBeFalsy()
    })

    it('does not set cookie when locale comes from URL path', () => {
      const mw = createI18nMiddleware({ ...BASE_CONFIG, setCookie: true })
      const req = makeRequest('/ja/about')

      mw(req)

      const res = mockNextResponse.next.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      const setCookieCall = res.headers.set.mock.calls.find(([name]) => name === 'set-cookie')
      expect(setCookieCall).toBeFalsy()
    })

    it('uses configured cookieName in Set-Cookie header', () => {
      const mw = createI18nMiddleware({ ...BASE_CONFIG, setCookie: true, cookieName: 'NEXT_LOCALE' })
      const req = makeRequest('/about', { acceptLanguage: 'ja' })

      mw(req)

      const res = mockNextResponse.redirect.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      const setCookieCall = res.headers.set.mock.calls.find(([name]) => name === 'set-cookie')
      expect(setCookieCall![1]).toContain('NEXT_LOCALE=ja')
    })
  })

  // ── localePrefix: 'never' ──────────────────────────────────────────────

  describe("localePrefix: 'never'", () => {
    const NEVER_CONFIG = { ...BASE_CONFIG, localePrefix: 'never' as const }

    it('skips path locale detection — /en/about is NOT treated as locale', () => {
      const mw = createI18nMiddleware(NEVER_CONFIG)
      mw(makeRequest('/en/about'))

      // Should pass through, not redirect or strip /en
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })

    it('uses detection chain for locale', () => {
      const mw = createI18nMiddleware(NEVER_CONFIG)
      mw(makeRequest('/about', { cookie: 'ja' }))

      const res = mockNextResponse.next.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      expect(res.headers.set).toHaveBeenCalledWith(LOCALE_HEADER, 'ja')
    })

    it('with rewriteDefaultLocale rewrites to /{locale}{path}', () => {
      const mw = createI18nMiddleware({ ...NEVER_CONFIG, rewriteDefaultLocale: true })
      mw(makeRequest('/about', { cookie: 'ja' }))

      expect(mockNextResponse.rewrite).toHaveBeenCalled()
      const url = mockNextResponse.rewrite.mock.calls[0]![0] as URL
      expect(url.pathname).toBe('/ja/about')
    })

    it('without rewriteDefaultLocale passes through', () => {
      const mw = createI18nMiddleware(NEVER_CONFIG)
      mw(makeRequest('/about'))

      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
    })

    it('always sets LOCALE_HEADER', () => {
      const mw = createI18nMiddleware(NEVER_CONFIG)
      mw(makeRequest('/about'))

      const res = mockNextResponse.next.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      expect(res.headers.set).toHaveBeenCalledWith(LOCALE_HEADER, 'en')
    })

    it('respects detectLocale custom function', () => {
      const mw = createI18nMiddleware({
        ...NEVER_CONFIG,
        detectLocale: () => 'zh-CN',
      })
      mw(makeRequest('/about'))

      const res = mockNextResponse.next.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      expect(res.headers.set).toHaveBeenCalledWith(LOCALE_HEADER, 'zh-CN')
    })
  })

  // ── alternateLinks ─────────────────────────────────────────────────────

  describe('alternateLinks', () => {
    it('adds Link header with all locales when enabled', () => {
      const mw = createI18nMiddleware({ ...BASE_CONFIG, alternateLinks: true })
      mw(makeRequest('/about'))

      const res = mockNextResponse.next.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      const linkCall = res.headers.set.mock.calls.find(([name]) => name === 'Link')
      expect(linkCall).toBeTruthy()
      const linkValue = linkCall![1] as string
      expect(linkValue).toContain('hreflang="en"')
      expect(linkValue).toContain('hreflang="ja"')
      expect(linkValue).toContain('hreflang="zh-CN"')
      expect(linkValue).toContain('hreflang="x-default"')
    })

    it('as-needed: sourceLocale has no prefix in alternate links', () => {
      const mw = createI18nMiddleware({ ...BASE_CONFIG, alternateLinks: true })
      mw(makeRequest('/about'))

      const res = mockNextResponse.next.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      const linkCall = res.headers.set.mock.calls.find(([name]) => name === 'Link')
      const linkValue = linkCall![1] as string
      // en (source) should have /about, not /en/about
      expect(linkValue).toContain('<http://localhost/about>; rel="alternate"; hreflang="en"')
      // ja should have /ja/about
      expect(linkValue).toContain('<http://localhost/ja/about>; rel="alternate"; hreflang="ja"')
    })

    it('always mode: all locales have prefix', () => {
      const mw = createI18nMiddleware({ ...BASE_CONFIG, localePrefix: 'always', alternateLinks: true })
      mw(makeRequest('/en/about'))

      const res = mockNextResponse.next.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      const linkCall = res.headers.set.mock.calls.find(([name]) => name === 'Link')
      const linkValue = linkCall![1] as string
      expect(linkValue).toContain('/en/about')
      expect(linkValue).toContain('/ja/about')
      expect(linkValue).toContain('/zh-CN/about')
    })

    it('no Link header when alternateLinks is false (default)', () => {
      const mw = createI18nMiddleware(BASE_CONFIG)
      mw(makeRequest('/about'))

      const res = mockNextResponse.next.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      const linkCall = res.headers.set.mock.calls.find(([name]) => name === 'Link')
      expect(linkCall).toBeFalsy()
    })

    it('resolves localized paths back to internal routes before building alternate links', () => {
      const mw = createI18nMiddleware({
        ...BASE_CONFIG,
        alternateLinks: true,
        pathnames: {
          '/about': { en: '/company', ja: '/kaisha' },
        },
      })
      const res = mw(makeRequest('/ja/kaisha')) as { headers: { set: ReturnType<typeof vi.fn> } }

      const linkCall = res.headers.set.mock.calls.find(([name]) => name === 'Link')
      const linkValue = linkCall![1] as string

      expect(linkValue).toContain('<http://localhost/company>; rel="alternate"; hreflang="en"')
      expect(linkValue).toContain('<http://localhost/ja/kaisha>; rel="alternate"; hreflang="ja"')
      expect(linkValue).toContain('<http://localhost/company>; rel="alternate"; hreflang="x-default"')
    })
  })

  // ── pathnames ──────────────────────────────────────────────────────────

  describe('pathnames', () => {
    const PATHNAMES_CONFIG = {
      ...BASE_CONFIG,
      pathnames: {
        '/about': { ja: '/about-ja', 'zh-CN': '/guanyu' },
        '/contact': { ja: '/otoiawase' },
      },
    }

    it('localized path rewrites to internal path', () => {
      const mw = createI18nMiddleware(PATHNAMES_CONFIG)
      mw(makeRequest('/ja/about-ja'))

      expect(mockNextResponse.rewrite).toHaveBeenCalled()
      const url = mockNextResponse.rewrite.mock.calls[0]![0] as URL
      expect(url.pathname).toBe('/ja/about')
    })

    it('internal path redirects to localized path', () => {
      const mw = createI18nMiddleware(PATHNAMES_CONFIG)
      mw(makeRequest('/ja/about'))

      expect(mockNextResponse.redirect).toHaveBeenCalled()
      const url = mockNextResponse.redirect.mock.calls[0]![0] as URL
      expect(url.pathname).toBe('/ja/about-ja')
    })

    it('unmapped paths pass through normally', () => {
      const mw = createI18nMiddleware(PATHNAMES_CONFIG)
      mw(makeRequest('/ja/other-page'))

      expect(mockNextResponse.next).toHaveBeenCalled()
    })

    it('unmapped locale for a path passes through', () => {
      const mw = createI18nMiddleware(PATHNAMES_CONFIG)
      // /contact has ja mapping but not zh-CN
      mw(makeRequest('/zh-CN/contact'))

      expect(mockNextResponse.next).toHaveBeenCalled()
    })

    it('source locale paths are not mapped (no redirect loop)', () => {
      const mw = createI18nMiddleware(PATHNAMES_CONFIG)
      // /about has ja/zh-CN mappings but no en mapping → pass through for source locale
      mw(makeRequest('/about'))

      // Should not redirect (no en mapping)
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })
  })

  // ── beforeResponse ─────────────────────────────────────────────────────

  describe('beforeResponse', () => {
    it('called with correct context for redirect', () => {
      const spy = vi.fn()
      const mw = createI18nMiddleware({ ...BASE_CONFIG, beforeResponse: spy })
      const req = makeRequest('/about', { cookie: 'ja' })
      mw(req)

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        locale: 'ja',
        type: 'redirect',
        request: req,
      }))
    })

    it('called with correct context for pass-through', () => {
      const spy = vi.fn()
      const mw = createI18nMiddleware({ ...BASE_CONFIG, beforeResponse: spy })
      mw(makeRequest('/about'))

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        locale: 'en',
        type: 'next',
      }))
    })

    it('can modify response headers', () => {
      const mw = createI18nMiddleware({
        ...BASE_CONFIG,
        beforeResponse: ({ response }) => {
          response.headers.set('x-custom', 'test')
        },
      })
      mw(makeRequest('/about'))

      const res = mockNextResponse.next.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      expect(res.headers.set).toHaveBeenCalledWith('x-custom', 'test')
    })

    it('can replace response entirely', () => {
      const customResponse = makeResponse()
      const mw = createI18nMiddleware({
        ...BASE_CONFIG,
        beforeResponse: () => customResponse,
      })
      const result = mw(makeRequest('/about'))

      expect(result).toBe(customResponse)
    })

    it('returning undefined uses default response', () => {
      const mw = createI18nMiddleware({
        ...BASE_CONFIG,
        beforeResponse: () => undefined,
      })
      mw(makeRequest('/about'))

      expect(mockNextResponse.next).toHaveBeenCalled()
    })

    it('type is rewrite for rewrite responses', () => {
      const spy = vi.fn()
      const mw = createI18nMiddleware({
        ...BASE_CONFIG,
        rewriteDefaultLocale: true,
        beforeResponse: spy,
      })
      mw(makeRequest('/about'))

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'rewrite',
      }))
    })
  })

  // ── cookieOptions ────────────────────────────────────────────────────────

  describe('cookieOptions', () => {
    it('includes domain in Set-Cookie header', () => {
      const mw = createI18nMiddleware({
        ...BASE_CONFIG,
        setCookie: true,
        cookieOptions: { domain: '.example.com' },
      })
      const req = makeRequest('/about', { acceptLanguage: 'ja' })
      mw(req)

      const res = mockNextResponse.redirect.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      const setCookieCall = res.headers.set.mock.calls.find(([name]: [string]) => name === 'set-cookie')
      expect(setCookieCall![1]).toContain('domain=.example.com')
    })

    it('includes secure flag for https URLs', () => {
      const mw = createI18nMiddleware({ ...BASE_CONFIG, setCookie: true })
      const headers = new Headers()
      headers.set('accept-language', 'ja')
      const req = {
        nextUrl: { pathname: '/about', search: '' },
        url: 'https://example.com/about',
        cookies: { get: () => undefined },
        headers,
      }
      mw(req)

      const res = mockNextResponse.redirect.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      const setCookieCall = res.headers.set.mock.calls.find(([name]: [string]) => name === 'set-cookie')
      expect(setCookieCall![1]).toContain('secure')
    })

    it('uses custom sameSite and maxAge', () => {
      const mw = createI18nMiddleware({
        ...BASE_CONFIG,
        setCookie: true,
        cookieOptions: { sameSite: 'strict', maxAge: 3600 },
      })
      mw(makeRequest('/about', { acceptLanguage: 'ja' }))

      const res = mockNextResponse.redirect.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      const setCookieCall = res.headers.set.mock.calls.find(([name]: [string]) => name === 'set-cookie')
      expect(setCookieCall![1]).toContain('samesite=strict')
      expect(setCookieCall![1]).toContain('max-age=3600')
    })
  })

  // ── localeDetection: false ──────────────────────────────────────────────

  describe('localeDetection: false', () => {
    it('always uses sourceLocale when detection is disabled', () => {
      const mw = createI18nMiddleware({
        ...BASE_CONFIG,
        localeDetection: false,
      })
      mw(makeRequest('/about', { cookie: 'ja', acceptLanguage: 'ja' }))

      // Should NOT redirect to /ja (detection disabled)
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      const res = mockNextResponse.next.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      expect(res.headers.set).toHaveBeenCalledWith(LOCALE_HEADER, 'en')
    })

    it('still respects locale from URL path', () => {
      const mw = createI18nMiddleware({
        ...BASE_CONFIG,
        localeDetection: false,
      })
      mw(makeRequest('/ja/about'))

      const res = mockNextResponse.next.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      expect(res.headers.set).toHaveBeenCalledWith(LOCALE_HEADER, 'ja')
    })
  })

  // ── domains ─────────────────────────────────────────────────────────────

  describe('domains', () => {
    const DOMAIN_CONFIG = {
      ...BASE_CONFIG,
      domains: [
        { domain: 'fr.example.com', defaultLocale: 'ja' },
        { domain: 'example.co.jp', defaultLocale: 'ja' },
      ],
    }

    function makeRequestWithHost(pathname: string, host: string) {
      const headers = new Headers()
      headers.set('host', host)
      return {
        nextUrl: { pathname, search: '' },
        url: `http://${host}${pathname}`,
        cookies: { get: () => undefined },
        headers,
      }
    }

    it('detects locale from domain', () => {
      const mw = createI18nMiddleware(DOMAIN_CONFIG)
      mw(makeRequestWithHost('/about', 'fr.example.com'))

      // Should redirect to /ja/about (domain defaultLocale is ja)
      expect(mockNextResponse.redirect).toHaveBeenCalled()
      const url = mockNextResponse.redirect.mock.calls[0]![0] as URL
      expect(url.pathname).toBe('/ja/about')
    })

    it('falls back to normal detection when domain not matched', () => {
      const mw = createI18nMiddleware(DOMAIN_CONFIG)
      mw(makeRequestWithHost('/about', 'example.com'))

      // No domain match → source locale → pass through
      expect(mockNextResponse.next).toHaveBeenCalled()
    })
  })

  // ── dynamic pathnames ([slug], [...path]) ───────────────────────────────

  describe('dynamic pathnames', () => {
    const DYNAMIC_CONFIG = {
      ...BASE_CONFIG,
      pathnames: {
        '/blog/[slug]': { ja: '/articles/[slug]' } as Record<string, string>,
        '/docs/[...path]': { ja: '/documentation/[...path]' } as Record<string, string>,
      },
    }

    it('rewrites dynamic localized path to internal path', () => {
      const mw = createI18nMiddleware(DYNAMIC_CONFIG)
      mw(makeRequest('/ja/articles/hello-world'))

      expect(mockNextResponse.rewrite).toHaveBeenCalled()
      const url = mockNextResponse.rewrite.mock.calls[0]![0] as URL
      expect(url.pathname).toBe('/ja/blog/hello-world')
    })

    it('redirects internal dynamic path to localized form', () => {
      const mw = createI18nMiddleware(DYNAMIC_CONFIG)
      mw(makeRequest('/ja/blog/hello-world'))

      expect(mockNextResponse.redirect).toHaveBeenCalled()
      const url = mockNextResponse.redirect.mock.calls[0]![0] as URL
      expect(url.pathname).toBe('/ja/articles/hello-world')
    })

    it('rewrites catch-all localized path', () => {
      const mw = createI18nMiddleware(DYNAMIC_CONFIG)
      mw(makeRequest('/ja/documentation/getting-started/install'))

      expect(mockNextResponse.rewrite).toHaveBeenCalled()
      const url = mockNextResponse.rewrite.mock.calls[0]![0] as URL
      expect(url.pathname).toBe('/ja/docs/getting-started/install')
    })
  })

  // ── getAlternateLinks callback ──────────────────────────────────────────

  describe('getAlternateLinks callback', () => {
    it('uses custom callback when provided', () => {
      const mw = createI18nMiddleware({
        ...BASE_CONFIG,
        getAlternateLinks: ({ origin, locales }) =>
          locales.map(l => ({ href: `${origin}/${l}`, hreflang: l })),
      })
      mw(makeRequest('/about'))

      const res = mockNextResponse.next.mock.results[0]!.value as { headers: { set: ReturnType<typeof vi.fn> } }
      const linkCall = res.headers.set.mock.calls.find(([name]: [string]) => name === 'Link')
      expect(linkCall).toBeTruthy()
      expect(linkCall![1]).toContain('hreflang="en"')
    })
  })
})
