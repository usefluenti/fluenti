import { describe, it, expect } from 'vitest'
import { localePath, extractLocaleFromPath, switchLocalePath } from '../src/runtime/path-utils'
import { extendPages } from '../src/runtime/page-extend'
import type { PageRoute } from '../src/runtime/page-extend'

describe('localePath', () => {
  describe('no_prefix strategy', () => {
    it('returns path unchanged', () => {
      expect(localePath('/about', 'ja', 'en', 'no_prefix')).toBe('/about')
      expect(localePath('/about', 'en', 'en', 'no_prefix')).toBe('/about')
    })
  })

  describe('prefix_except_default strategy', () => {
    it('does not prefix the default locale', () => {
      expect(localePath('/about', 'en', 'en', 'prefix_except_default')).toBe('/about')
    })

    it('prefixes non-default locales', () => {
      expect(localePath('/about', 'ja', 'en', 'prefix_except_default')).toBe('/ja/about')
    })

    it('handles root path', () => {
      expect(localePath('/', 'ja', 'en', 'prefix_except_default')).toBe('/ja')
      expect(localePath('/', 'en', 'en', 'prefix_except_default')).toBe('/')
    })

    it('handles paths without leading slash', () => {
      expect(localePath('about', 'en', 'en', 'prefix_except_default')).toBe('/about')
    })
  })

  describe('prefix strategy', () => {
    it('always prefixes, including default locale', () => {
      expect(localePath('/about', 'en', 'en', 'prefix')).toBe('/en/about')
      expect(localePath('/about', 'ja', 'en', 'prefix')).toBe('/ja/about')
    })

    it('handles root path', () => {
      expect(localePath('/', 'en', 'en', 'prefix')).toBe('/en')
      expect(localePath('/', 'ja', 'en', 'prefix')).toBe('/ja')
    })
  })

  describe('prefix_and_default strategy', () => {
    it('always prefixes (same as prefix)', () => {
      expect(localePath('/about', 'en', 'en', 'prefix_and_default')).toBe('/en/about')
      expect(localePath('/about', 'ja', 'en', 'prefix_and_default')).toBe('/ja/about')
    })
  })
})

describe('extractLocaleFromPath', () => {
  const locales = ['en', 'ja', 'zh']

  it('extracts a locale from the first path segment', () => {
    const result = extractLocaleFromPath('/ja/about', locales)
    expect(result.locale).toBe('ja')
    expect(result.pathWithoutLocale).toBe('/about')
  })

  it('returns null when first segment is not a known locale', () => {
    const result = extractLocaleFromPath('/about', locales)
    expect(result.locale).toBeNull()
    expect(result.pathWithoutLocale).toBe('/about')
  })

  it('handles root path with locale', () => {
    const result = extractLocaleFromPath('/en', locales)
    expect(result.locale).toBe('en')
    expect(result.pathWithoutLocale).toBe('/')
  })

  it('handles bare root', () => {
    const result = extractLocaleFromPath('/', locales)
    expect(result.locale).toBeNull()
    expect(result.pathWithoutLocale).toBe('/')
  })

  it('handles nested paths', () => {
    const result = extractLocaleFromPath('/zh/docs/guide/intro', locales)
    expect(result.locale).toBe('zh')
    expect(result.pathWithoutLocale).toBe('/docs/guide/intro')
  })
})

describe('switchLocalePath', () => {
  const locales = ['en', 'ja', 'zh']

  it('switches locale prefix on a prefixed path', () => {
    expect(switchLocalePath('/ja/about', 'en', locales, 'en', 'prefix_except_default')).toBe('/about')
    expect(switchLocalePath('/ja/about', 'zh', locales, 'en', 'prefix_except_default')).toBe('/zh/about')
  })

  it('adds prefix when switching from unprefixed (default locale) path', () => {
    expect(switchLocalePath('/about', 'ja', locales, 'en', 'prefix_except_default')).toBe('/ja/about')
  })

  it('returns same path for no_prefix strategy', () => {
    expect(switchLocalePath('/about', 'ja', locales, 'en', 'no_prefix')).toBe('/about')
  })

  it('handles root path switching', () => {
    expect(switchLocalePath('/ja', 'en', locales, 'en', 'prefix_except_default')).toBe('/')
    expect(switchLocalePath('/', 'ja', locales, 'en', 'prefix_except_default')).toBe('/ja')
  })
})

describe('localePath edge cases', () => {
  it('no_prefix returns path unchanged for any locale', () => {
    expect(localePath('/dashboard/settings', 'ja', 'en', 'no_prefix')).toBe('/dashboard/settings')
    expect(localePath('/dashboard/settings', 'zh', 'en', 'no_prefix')).toBe('/dashboard/settings')
  })

  it('prefix_except_default returns unprefixed path for default locale', () => {
    expect(localePath('/contact', 'en', 'en', 'prefix_except_default')).toBe('/contact')
  })

  it('prefix_except_default adds prefix for non-default locale', () => {
    expect(localePath('/contact', 'zh', 'en', 'prefix_except_default')).toBe('/zh/contact')
  })

  it('prefix strategy always adds prefix including default locale', () => {
    expect(localePath('/contact', 'en', 'en', 'prefix')).toBe('/en/contact')
    expect(localePath('/contact', 'ja', 'en', 'prefix')).toBe('/ja/contact')
  })

  it('handles root path "/" correctly for all strategies', () => {
    expect(localePath('/', 'en', 'en', 'no_prefix')).toBe('/')
    expect(localePath('/', 'en', 'en', 'prefix_except_default')).toBe('/')
    expect(localePath('/', 'ja', 'en', 'prefix_except_default')).toBe('/ja')
    expect(localePath('/', 'en', 'en', 'prefix')).toBe('/en')
    expect(localePath('/', 'ja', 'en', 'prefix')).toBe('/ja')
  })
})

describe('extractLocaleFromPath edge cases', () => {
  const locales = ['en', 'ja', 'zh']

  it('extracts valid locale from path', () => {
    const result = extractLocaleFromPath('/en/dashboard', locales)
    expect(result.locale).toBe('en')
    expect(result.pathWithoutLocale).toBe('/dashboard')
  })

  it('returns null locale for non-locale first segment', () => {
    const result = extractLocaleFromPath('/dashboard/settings', locales)
    expect(result.locale).toBeNull()
    expect(result.pathWithoutLocale).toBe('/dashboard/settings')
  })

  it('returns null locale and "/" for bare root path', () => {
    const result = extractLocaleFromPath('/', locales)
    expect(result.locale).toBeNull()
    expect(result.pathWithoutLocale).toBe('/')
  })
})

describe('switchLocalePath edge cases', () => {
  const locales = ['en', 'ja', 'zh']

  it('preserves the path segment when switching locales', () => {
    const result = switchLocalePath('/ja/docs/guide', 'zh', locales, 'en', 'prefix_except_default')
    expect(result).toBe('/zh/docs/guide')
  })

  it('returns current path unchanged for no_prefix strategy', () => {
    const result = switchLocalePath('/docs/guide', 'ja', locales, 'en', 'no_prefix')
    expect(result).toBe('/docs/guide')
  })
})

describe('extendPages', () => {
  it('adds locale-prefixed routes for prefix_except_default', () => {
    const pages: PageRoute[] = [
      { path: '/', name: 'index' },
      { path: '/about', name: 'about' },
    ]

    extendPages(pages, {
      locales: ['en', 'ja', 'zh'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
    })

    // Original 2 + 2 for ja + 2 for zh = 6
    expect(pages).toHaveLength(6)

    // Original routes preserved
    expect(pages.find((p) => p.path === '/' && p.name === 'index')).toBeDefined()
    expect(pages.find((p) => p.path === '/about' && p.name === 'about')).toBeDefined()

    // ja routes added
    expect(pages.find((p) => p.path === '/ja' && p.name === 'index___ja')).toBeDefined()
    expect(pages.find((p) => p.path === '/ja/about' && p.name === 'about___ja')).toBeDefined()

    // zh routes added
    expect(pages.find((p) => p.path === '/zh' && p.name === 'index___zh')).toBeDefined()
    expect(pages.find((p) => p.path === '/zh/about' && p.name === 'about___zh')).toBeDefined()
  })

  it('removes unprefixed routes for prefix strategy', () => {
    const pages: PageRoute[] = [
      { path: '/', name: 'index' },
      { path: '/about', name: 'about' },
    ]

    extendPages(pages, {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix',
    })

    // Only prefixed routes remain: 2 for en + 2 for ja = 4
    expect(pages).toHaveLength(4)
    expect(pages.find((p) => p.path === '/')).toBeUndefined()
    expect(pages.find((p) => p.path === '/about')).toBeUndefined()
    expect(pages.find((p) => p.path === '/en')).toBeDefined()
    expect(pages.find((p) => p.path === '/ja/about')).toBeDefined()
  })

  it('does nothing for no_prefix strategy', () => {
    const pages: PageRoute[] = [
      { path: '/', name: 'index' },
    ]

    extendPages(pages, {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'no_prefix',
    })

    expect(pages).toHaveLength(1)
  })

  it('handles prefix_and_default (all locales prefixed, originals kept)', () => {
    const pages: PageRoute[] = [
      { path: '/', name: 'index' },
    ]

    extendPages(pages, {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix_and_default',
    })

    // Original 1 + 1 for en + 1 for ja = 3
    expect(pages).toHaveLength(3)
    expect(pages.find((p) => p.path === '/')).toBeDefined()
    expect(pages.find((p) => p.path === '/en')).toBeDefined()
    expect(pages.find((p) => p.path === '/ja')).toBeDefined()
  })

  it('uses custom routeNameTemplate when provided', () => {
    const pages: PageRoute[] = [
      { path: '/', name: 'index' },
      { path: '/about', name: 'about' },
    ]

    extendPages(pages, {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      routeNameTemplate: (name, locale) => `${locale}:${name}`,
    })

    expect(pages.find((p) => p.path === '/ja' && p.name === 'ja:index')).toBeDefined()
    expect(pages.find((p) => p.path === '/ja/about' && p.name === 'ja:about')).toBeDefined()
    // Original routes unchanged
    expect(pages.find((p) => p.path === '/' && p.name === 'index')).toBeDefined()
  })

  it('applies routeNameTemplate to child routes', () => {
    const pages: PageRoute[] = [
      {
        path: '/docs',
        name: 'docs',
        children: [{ path: 'guide', name: 'docs-guide' }],
      },
    ]

    extendPages(pages, {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      routeNameTemplate: (name, locale) => `${locale}--${name}`,
    })

    const jaDoc = pages.find((p) => p.path === '/ja/docs')
    expect(jaDoc?.name).toBe('ja--docs')
    expect(jaDoc?.children?.[0]?.name).toBe('ja--docs-guide')
  })

  it('falls back to default ___locale template when routeNameTemplate is undefined', () => {
    const pages: PageRoute[] = [
      { path: '/', name: 'index' },
    ]

    extendPages(pages, {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      routeNameTemplate: undefined,
    })

    expect(pages.find((p) => p.name === 'index___ja')).toBeDefined()
  })

  it('applies routeOverrides for custom locale paths', () => {
    const pages: PageRoute[] = [
      { path: '/', name: 'index' },
      { path: '/about', name: 'about' },
    ]

    extendPages(pages, {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      routeOverrides: {
        '/about': { ja: '/について' },
      },
    })

    const jaAbout = pages.find((p) => p.name === 'about___ja')
    expect(jaAbout).toBeDefined()
    expect(jaAbout!.path).toBe('/ja/について')
  })

  it('uses original path when no routeOverride exists for locale', () => {
    const pages: PageRoute[] = [
      { path: '/contact', name: 'contact' },
    ]

    extendPages(pages, {
      locales: ['en', 'ja', 'zh'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      routeOverrides: {
        '/contact': { ja: '/お問い合わせ' },
      },
    })

    // zh has no override, should use original path
    const zhContact = pages.find((p) => p.name === 'contact___zh')
    expect(zhContact!.path).toBe('/zh/contact')

    // ja has override
    const jaContact = pages.find((p) => p.name === 'contact___ja')
    expect(jaContact!.path).toBe('/ja/お問い合わせ')
  })

  it('does nothing for domains strategy', () => {
    const pages: PageRoute[] = [
      { path: '/', name: 'index' },
    ]

    extendPages(pages, {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'domains',
    })

    expect(pages).toHaveLength(1)
  })

  it('respects per-page locale restriction via meta.i18nRoute', () => {
    const pages: PageRoute[] = [
      { path: '/', name: 'index' },
      { path: '/pricing', name: 'pricing', meta: { i18nRoute: { locales: ['en'] } } },
    ]

    extendPages(pages, {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix',
    })

    // index: 2 prefixed (en + ja), pricing: 1 prefixed (en only) = 3
    expect(pages.find((p) => p.path === '/en' && p.name === 'index___en')).toBeDefined()
    expect(pages.find((p) => p.path === '/ja' && p.name === 'index___ja')).toBeDefined()
    expect(pages.find((p) => p.path === '/en/pricing' && p.name === 'pricing___en')).toBeDefined()
    expect(pages.find((p) => p.path === '/ja/pricing')).toBeUndefined()
  })

  it('excludes page entirely when meta.i18nRoute is false', () => {
    const pages: PageRoute[] = [
      { path: '/', name: 'index' },
      { path: '/internal', name: 'internal', meta: { i18nRoute: false } },
    ]

    extendPages(pages, {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix',
    })

    // index: 2 prefixed, internal: 0 (disabled) = 2
    expect(pages).toHaveLength(2)
    expect(pages.find((p) => p.path === '/en')).toBeDefined()
    expect(pages.find((p) => p.path === '/ja')).toBeDefined()
    expect(pages.find((p) => p.path.includes('internal'))).toBeUndefined()
  })

  it('filters out disabled pages for default locale in prefix_except_default', () => {
    const pages: PageRoute[] = [
      { path: '/', name: 'index' },
      { path: '/ja-only', name: 'ja-only', meta: { i18nRoute: { locales: ['ja'] } } },
    ]

    extendPages(pages, {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
    })

    // index: original + ja = 2, ja-only: ja prefixed only = 1, total = 3
    expect(pages.find((p) => p.path === '/' && p.name === 'index')).toBeDefined()
    expect(pages.find((p) => p.path === '/ja' && p.name === 'index___ja')).toBeDefined()
    expect(pages.find((p) => p.path === '/ja/ja-only' && p.name === 'ja-only___ja')).toBeDefined()
    // ja-only should NOT appear as unprefixed (default locale)
    expect(pages.find((p) => p.path === '/ja-only' && p.name === 'ja-only')).toBeUndefined()
  })
})
