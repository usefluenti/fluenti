import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLocalePath } from '../src/navigation'

// ── Mock next/navigation and @fluenti/react for useLocaleSwitcher ────────────
const mockPush = vi.fn()
const mockRefresh = vi.fn()
let mockPathname = '/about'
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => mockPathname,
}))

const mockSetLocale = vi.fn()
const mockGetLocales = vi.fn(() => ['en', 'fr', 'ja'])
let mockI18nLocale = 'en'
let mockUseI18nThrows = false
vi.mock('@fluenti/react', () => ({
  useI18n: () => {
    if (mockUseI18nThrows) {
      throw new Error('[fluenti] useI18n() must be used within an <I18nProvider>')
    }
    return { locale: mockI18nLocale, setLocale: mockSetLocale, getLocales: mockGetLocales }
  },
}))

describe('getLocalePath', () => {
  // ── Basic prefix addition ────────────────────────────────────────────
  it('adds locale prefix for non-source locale', () => {
    expect(getLocalePath('/about', 'fr')).toBe('/fr/about')
  })

  it('adds locale prefix to root path', () => {
    expect(getLocalePath('/', 'fr')).toBe('/fr/')
  })

  it('adds locale prefix for Japanese', () => {
    expect(getLocalePath('/products/shoes', 'ja')).toBe('/ja/products/shoes')
  })

  // ── Source locale (no prefix) ─────────────────────────────────────────
  it('returns path without prefix for source locale (default en)', () => {
    expect(getLocalePath('/about', 'en')).toBe('/about')
  })

  it('returns / for root path with source locale', () => {
    expect(getLocalePath('/', 'en')).toBe('/')
  })

  it('respects custom sourceLocale option', () => {
    expect(getLocalePath('/about', 'fr', { sourceLocale: 'fr' })).toBe('/about')
    expect(getLocalePath('/about', 'en', { sourceLocale: 'fr' })).toBe('/en/about')
  })

  // ── Strip existing prefix ─────────────────────────────────────────────
  it('strips existing locale prefix when switching locale', () => {
    expect(getLocalePath('/fr/about', 'ja', { locales: ['en', 'fr', 'ja'] })).toBe('/ja/about')
  })

  it('strips existing locale prefix when switching to source locale', () => {
    expect(getLocalePath('/fr/about', 'en', { locales: ['en', 'fr', 'ja'] })).toBe('/about')
  })

  it('strips existing locale prefix at root', () => {
    // /fr → strips "fr" → pathWithoutLocale is "/" → result is "/ja/"
    expect(getLocalePath('/fr', 'ja', { locales: ['en', 'fr', 'ja'] })).toBe('/ja/')
  })

  it('strips existing locale prefix for same locale', () => {
    expect(getLocalePath('/fr/about', 'fr', { locales: ['en', 'fr', 'ja'] })).toBe('/fr/about')
  })

  // ── locales list (exact match, avoid false positives) ────────────────
  it('does not strip non-locale 2-letter segment when locales list is provided', () => {
    const locales = ['en', 'fr', 'ja']
    // /us/pricing — "us" is not in locales, should not be stripped
    expect(getLocalePath('/us/pricing', 'fr', { locales })).toBe('/fr/us/pricing')
  })

  it('strips locale prefix when it is in the locales list', () => {
    const locales = ['en', 'fr', 'ja']
    expect(getLocalePath('/fr/about', 'ja', { locales })).toBe('/ja/about')
  })

  it('does not strip /my/ path segment (false positive without locales list)', () => {
    const locales = ['en', 'fr', 'ja', 'zh-CN']
    expect(getLocalePath('/my/account', 'fr', { locales })).toBe('/fr/my/account')
  })

  it('does not guess locale prefixes when locales are omitted', () => {
    expect(getLocalePath('/fr/about', 'ja')).toBe('/ja/fr/about')
    expect(getLocalePath('/my/account', 'fr')).toBe('/fr/my/account')
    expect(getLocalePath('/us/pricing', 'ja')).toBe('/ja/us/pricing')
  })

  // ── Edge cases ──────────────────────────────────────────────────────
  it('handles zh-CN locale format', () => {
    expect(getLocalePath('/about', 'zh-CN')).toBe('/zh-CN/about')
  })

  it('handles nested paths', () => {
    expect(getLocalePath('/docs/api/reference', 'fr')).toBe('/fr/docs/api/reference')
  })

  it('strips zh-CN prefix when switching', () => {
    expect(getLocalePath('/zh-CN/about', 'ja', { locales: ['en', 'ja', 'zh-CN'] })).toBe('/ja/about')
  })

  // ── localePrefix: 'always' ────────────────────────────────────────────
  describe("localePrefix: 'always'", () => {
    it('adds prefix for source locale', () => {
      expect(getLocalePath('/about', 'en', { localePrefix: 'always' })).toBe('/en/about')
    })

    it('adds prefix for source locale on root path', () => {
      expect(getLocalePath('/', 'en', { localePrefix: 'always' })).toBe('/en/')
    })

    it('strips and re-adds prefix for non-source locale', () => {
      expect(getLocalePath('/fr/about', 'ja', { localePrefix: 'always', locales: ['en', 'fr', 'ja'] })).toBe('/ja/about')
    })

    it('still adds prefix for source locale even when it matches sourceLocale option', () => {
      expect(
        getLocalePath('/about', 'fr', { sourceLocale: 'fr', localePrefix: 'always' }),
      ).toBe('/fr/about')
    })
  })
})

// ── useLocaleSwitcher ────────────────────────────────────────────────────────

describe('useLocaleSwitcher', () => {
  // Stub document.cookie (unavailable in node test env)
  beforeEach(() => {
    vi.stubGlobal('document', { cookie: '' })
    mockPush.mockReset()
    mockRefresh.mockReset()
    mockSetLocale.mockReset()
    mockPathname = '/about'
    mockI18nLocale = 'en'
    mockUseI18nThrows = false
  })

  // Import lazily so mocks above are in place
  async function getHook() {
    const { useLocaleSwitcher } = await import('../src/navigation')
    return useLocaleSwitcher
  }

  it('switchLocale navigates to the locale-prefixed path', async () => {
    const useLocaleSwitcher = await getHook()
    const { switchLocale } = useLocaleSwitcher()
    switchLocale('fr')
    // /about + fr → /fr/about
    expect(mockPush).toHaveBeenCalledWith('/fr/about')
  })

  it('switchLocale updates react context via setLocale', async () => {
    const useLocaleSwitcher = await getHook()
    const { switchLocale } = useLocaleSwitcher()
    switchLocale('ja')
    expect(mockSetLocale).toHaveBeenCalledWith('ja')
  })

  it('switchLocale calls router.refresh() for server component refresh', async () => {
    const useLocaleSwitcher = await getHook()
    const { switchLocale } = useLocaleSwitcher()
    switchLocale('fr')
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('returns currentLocale from i18n context', async () => {
    const useLocaleSwitcher = await getHook()
    const { currentLocale } = useLocaleSwitcher()
    expect(currentLocale).toBe('en')
  })

  it('returns locales from i18n context', async () => {
    const useLocaleSwitcher = await getHook()
    const { locales } = useLocaleSwitcher()
    expect(locales).toEqual(['en', 'fr', 'ja'])
  })

  it('switching to source locale removes prefix', async () => {
    const useLocaleSwitcher = await getHook()
    const { switchLocale } = useLocaleSwitcher()
    // mock pathname is /about (no prefix), switching to en (source) stays /about
    switchLocale('en')
    expect(mockPush).toHaveBeenCalledWith('/about')
  })

  it('writes cookie with default name "locale"', async () => {
    const useLocaleSwitcher = await getHook()
    const { switchLocale } = useLocaleSwitcher()
    const cookies: string[] = []
    Object.defineProperty(document, 'cookie', {
      set: (v: string) => { cookies.push(v) },
      configurable: true,
    })
    switchLocale('fr')
    expect(cookies.some(c => c.startsWith('locale=fr'))).toBe(true)
  })

  it('writes cookie with custom cookieName', async () => {
    const useLocaleSwitcher = await getHook()
    const { switchLocale } = useLocaleSwitcher({ cookieName: 'NEXT_LOCALE' })
    const cookies: string[] = []
    Object.defineProperty(document, 'cookie', {
      set: (v: string) => { cookies.push(v) },
      configurable: true,
    })
    switchLocale('fr')
    expect(cookies.some(c => c.startsWith('NEXT_LOCALE=fr'))).toBe(true)
  })

  describe("localePrefix: 'always'", () => {
    it('adds prefix for source locale when switching', async () => {
      const useLocaleSwitcher = await getHook()
      const { switchLocale } = useLocaleSwitcher({ localePrefix: 'always' })
      switchLocale('en')
      // source locale gets prefix in 'always' mode
      expect(mockPush).toHaveBeenCalledWith('/en/about')
    })

    it('adds prefix for non-source locale when switching', async () => {
      const useLocaleSwitcher = await getHook()
      const { switchLocale } = useLocaleSwitcher({ localePrefix: 'always' })
      switchLocale('fr')
      expect(mockPush).toHaveBeenCalledWith('/fr/about')
    })
  })

  describe("localePrefix: 'never'", () => {
    it('getLocalePath returns path without prefix for any locale', () => {
      expect(getLocalePath('/about', 'fr', { localePrefix: 'never' })).toBe('/about')
      expect(getLocalePath('/about', 'en', { localePrefix: 'never' })).toBe('/about')
      expect(getLocalePath('/about', 'ja', { localePrefix: 'never' })).toBe('/about')
    })

    it('getLocalePath strips existing prefix in never mode', () => {
      expect(getLocalePath('/fr/about', 'en', { localePrefix: 'never', locales: ['en', 'fr'] })).toBe('/about')
    })

    it('useLocaleSwitcher navigates without locale prefix in never mode', async () => {
      const useLocaleSwitcher = await getHook()
      const { switchLocale } = useLocaleSwitcher({ localePrefix: 'never' })
      switchLocale('fr')
      expect(mockPush).toHaveBeenCalledWith('/about')
    })
  })
})

describe('useAlternateLinks', () => {
  beforeEach(() => {
    mockPathname = '/about'
    mockI18nLocale = 'en'
    mockUseI18nThrows = false
  })

  async function getHook() {
    const { useAlternateLinks } = await import('../src/navigation')
    return useAlternateLinks
  }

  it('resolves localized current paths back to internal routes before building links', async () => {
    mockPathname = '/ja/kaisha'
    mockI18nLocale = 'ja'

    const useAlternateLinks = await getHook()
    const links = useAlternateLinks({
      baseUrl: 'https://example.com',
      routing: {
        locales: ['en', 'ja'],
        sourceLocale: 'en',
        localePrefix: 'as-needed',
        pathnames: {
          '/about': { en: '/company', ja: '/kaisha' },
        },
      },
    })

    expect(links).toContainEqual({ hreflang: 'en', href: 'https://example.com/company' })
    expect(links).toContainEqual({ hreflang: 'ja', href: 'https://example.com/ja/kaisha' })
    expect(links).toContainEqual({ hreflang: 'x-default', href: 'https://example.com/company' })
  })

  it('uses the active locale for reverse lookup when locale prefixes are disabled', async () => {
    mockPathname = '/kaisha'
    mockI18nLocale = 'ja'

    const useAlternateLinks = await getHook()
    const links = useAlternateLinks({
      baseUrl: 'https://example.com',
      routing: {
        locales: ['en', 'ja'],
        sourceLocale: 'en',
        localePrefix: 'never',
        pathnames: {
          '/about': { en: '/company', ja: '/kaisha' },
        },
      },
    })

    expect(links).toContainEqual({ hreflang: 'en', href: 'https://example.com/company' })
    expect(links).toContainEqual({ hreflang: 'ja', href: 'https://example.com/kaisha' })
    expect(links).toContainEqual({ hreflang: 'x-default', href: 'https://example.com/company' })
  })

  it('falls back to sourceLocale when used outside I18nProvider', async () => {
    mockPathname = '/about'
    mockUseI18nThrows = true

    const useAlternateLinks = await getHook()
    const links = useAlternateLinks({
      baseUrl: 'https://example.com',
      routing: {
        locales: ['en', 'ja'],
        sourceLocale: 'en',
        localePrefix: 'as-needed',
        pathnames: {
          '/about': { en: '/company', ja: '/kaisha' },
        },
      },
    })

    expect(links).toContainEqual({ hreflang: 'en', href: 'https://example.com/company' })
    expect(links).toContainEqual({ hreflang: 'ja', href: 'https://example.com/ja/kaisha' })
    expect(links).toContainEqual({ hreflang: 'x-default', href: 'https://example.com/company' })
  })
})
