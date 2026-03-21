import { describe, it, expect } from 'vitest'
import { buildLocaleHead } from '../src/runtime/locale-head'
import type { FluentNuxtRuntimeConfig } from '../src/types'

describe('buildLocaleHead', () => {
  const config: FluentNuxtRuntimeConfig = {
    locales: ['en', 'ja', 'zh'],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectOrder: ['cookie', 'header', 'path', 'query'],
  }

  it('sets htmlAttrs.lang to current locale', () => {
    const head = buildLocaleHead('ja', '/ja/about', config)
    expect(head.htmlAttrs.lang).toBe('ja')
  })

  it('returns empty link/meta when addSeoAttributes is false', () => {
    const head = buildLocaleHead('en', '/about', config)
    expect(head.link).toEqual([])
    expect(head.meta).toEqual([])
  })

  it('generates hreflang links when addSeoAttributes is true', () => {
    const head = buildLocaleHead('en', '/about', config, { addSeoAttributes: true })

    // Should have links for en, ja, zh + x-default + canonical = 5
    expect(head.link).toHaveLength(5)

    expect(head.link).toContainEqual({
      rel: 'alternate',
      hreflang: 'en',
      href: '/about',
    })
    expect(head.link).toContainEqual({
      rel: 'alternate',
      hreflang: 'ja',
      href: '/ja/about',
    })
    expect(head.link).toContainEqual({
      rel: 'alternate',
      hreflang: 'zh',
      href: '/zh/about',
    })
    expect(head.link).toContainEqual({
      rel: 'alternate',
      hreflang: 'x-default',
      href: '/about',
    })
  })

  it('includes baseUrl in hreflang hrefs', () => {
    const head = buildLocaleHead('en', '/about', config, {
      addSeoAttributes: true,
      baseUrl: 'https://example.com',
    })

    expect(head.link[0]!.href).toBe('https://example.com/about')
    expect(head.link[1]!.href).toBe('https://example.com/ja/about')
  })

  it('generates og:locale meta tags', () => {
    const head = buildLocaleHead('ja', '/ja/about', config, { addSeoAttributes: true })

    expect(head.meta).toContainEqual({
      property: 'og:locale',
      content: 'ja',
    })

    // Should have og:locale:alternate for other locales
    const alternates = head.meta.filter((m) => m.property === 'og:locale:alternate')
    expect(alternates).toHaveLength(2)
    expect(alternates.map((m) => m.content).sort()).toEqual(['en', 'zh'])
  })
})

describe('buildLocaleHead edge cases', () => {
  it('htmlAttrs.lang reflects the current locale for each locale', () => {
    const config: FluentNuxtRuntimeConfig = {
      locales: ['en', 'ja', 'zh'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      detectOrder: ['cookie', 'header', 'path', 'query'],
    }

    expect(buildLocaleHead('en', '/', config).htmlAttrs.lang).toBe('en')
    expect(buildLocaleHead('ja', '/ja', config).htmlAttrs.lang).toBe('ja')
    expect(buildLocaleHead('zh', '/zh', config).htmlAttrs.lang).toBe('zh')
  })

  it('returns no link/meta when addSeoAttributes option is omitted', () => {
    const config: FluentNuxtRuntimeConfig = {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix',
      detectOrder: ['cookie', 'header', 'path', 'query'],
    }

    const head = buildLocaleHead('en', '/en/about', config)
    expect(head.link).toEqual([])
    expect(head.meta).toEqual([])
    expect(head.htmlAttrs.lang).toBe('en')
  })

  it('generates x-default hreflang pointing to default locale path', () => {
    const config: FluentNuxtRuntimeConfig = {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      detectOrder: ['cookie', 'header', 'path', 'query'],
    }

    const head = buildLocaleHead('ja', '/ja/about', config, { addSeoAttributes: true })
    const xDefault = head.link.find((l) => l.hreflang === 'x-default')
    expect(xDefault).toBeDefined()
    expect(xDefault!.href).toBe('/about')
  })

  it('generates og:locale meta for the current locale', () => {
    const config: FluentNuxtRuntimeConfig = {
      locales: ['en', 'ja', 'zh'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      detectOrder: ['cookie', 'header', 'path', 'query'],
    }

    const head = buildLocaleHead('zh', '/zh/contact', config, { addSeoAttributes: true })
    const ogLocale = head.meta.find((m) => m.property === 'og:locale')
    expect(ogLocale).toBeDefined()
    expect(ogLocale!.content).toBe('zh')
  })

  it('generates og:locale:alternate for all non-current locales', () => {
    const config: FluentNuxtRuntimeConfig = {
      locales: ['en', 'ja', 'zh'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      detectOrder: ['cookie', 'header', 'path', 'query'],
    }

    const head = buildLocaleHead('en', '/about', config, { addSeoAttributes: true })
    const alternates = head.meta.filter((m) => m.property === 'og:locale:alternate')
    expect(alternates).toHaveLength(2)
    expect(alternates.map((m) => m.content).sort()).toEqual(['ja', 'zh'])
  })

  it('prepends baseUrl to all hreflang hrefs', () => {
    const config: FluentNuxtRuntimeConfig = {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      detectOrder: ['cookie', 'header', 'path', 'query'],
    }

    const head = buildLocaleHead('en', '/about', config, {
      addSeoAttributes: true,
      baseUrl: 'https://mysite.io',
    })

    for (const link of head.link) {
      expect(link.href.startsWith('https://mysite.io')).toBe(true)
    }
  })

  it('no_prefix strategy produces same path for all locales in hreflang', () => {
    const config: FluentNuxtRuntimeConfig = {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'no_prefix',
      detectOrder: ['cookie', 'header', 'path', 'query'],
    }

    const head = buildLocaleHead('en', '/about', config, { addSeoAttributes: true })
    // All hreflang links point to /about since no_prefix never changes the path
    const hrefs = head.link.map((l) => l.href)
    expect(hrefs.every((h) => h === '/about')).toBe(true)
  })

  it('prefix_except_default strategy omits prefix for default locale hreflang', () => {
    const config: FluentNuxtRuntimeConfig = {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      detectOrder: ['cookie', 'header', 'path', 'query'],
    }

    const head = buildLocaleHead('ja', '/ja/docs', config, { addSeoAttributes: true })
    const enLink = head.link.find((l) => l.hreflang === 'en')
    const jaLink = head.link.find((l) => l.hreflang === 'ja')
    expect(enLink!.href).toBe('/docs')
    expect(jaLink!.href).toBe('/ja/docs')
  })

  it('prefix strategy adds prefix for all locales including default', () => {
    const config: FluentNuxtRuntimeConfig = {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix',
      detectOrder: ['cookie', 'header', 'path', 'query'],
    }

    const head = buildLocaleHead('en', '/en/about', config, { addSeoAttributes: true })
    const enLink = head.link.find((l) => l.hreflang === 'en')
    const jaLink = head.link.find((l) => l.hreflang === 'ja')
    expect(enLink!.href).toBe('/en/about')
    expect(jaLink!.href).toBe('/ja/about')
  })
})

describe('buildLocaleHead with locale properties', () => {
  it('uses iso tag from localeProperties for htmlAttrs.lang', () => {
    const config: FluentNuxtRuntimeConfig = {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      detectOrder: ['path', 'cookie'],
      queryParamKey: 'locale',
      injectGlobalProperties: true,
      localeProperties: {
        en: { code: 'en', iso: 'en-US' },
        ja: { code: 'ja', iso: 'ja-JP' },
      },
    }

    const head = buildLocaleHead('en', '/about', config)
    expect(head.htmlAttrs.lang).toBe('en-US')

    const headJa = buildLocaleHead('ja', '/ja/about', config)
    expect(headJa.htmlAttrs.lang).toBe('ja-JP')
  })

  it('sets dir attribute from localeProperties', () => {
    const config: FluentNuxtRuntimeConfig = {
      locales: ['en', 'ar'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      detectOrder: ['path'],
      queryParamKey: 'locale',
      injectGlobalProperties: true,
      localeProperties: {
        en: { code: 'en', dir: 'ltr' },
        ar: { code: 'ar', dir: 'rtl' },
      },
    }

    const headAr = buildLocaleHead('ar', '/ar/about', config)
    expect(headAr.htmlAttrs.dir).toBe('rtl')

    const headEn = buildLocaleHead('en', '/about', config)
    expect(headEn.htmlAttrs.dir).toBe('ltr')
  })

  it('uses iso tags in hreflang and og:locale when localeProperties provided', () => {
    const config: FluentNuxtRuntimeConfig = {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      detectOrder: ['path'],
      queryParamKey: 'locale',
      injectGlobalProperties: true,
      localeProperties: {
        en: { code: 'en', iso: 'en-US' },
        ja: { code: 'ja', iso: 'ja-JP' },
      },
    }

    const head = buildLocaleHead('en', '/about', config, { addSeoAttributes: true })
    expect(head.link.find((l) => l.hreflang === 'en-US')).toBeDefined()
    expect(head.link.find((l) => l.hreflang === 'ja-JP')).toBeDefined()
    expect(head.meta.find((m) => m.content === 'en-US' && m.property === 'og:locale')).toBeDefined()
    expect(head.meta.find((m) => m.content === 'ja-JP' && m.property === 'og:locale:alternate')).toBeDefined()
  })

  it('omits dir when not specified', () => {
    const config: FluentNuxtRuntimeConfig = {
      locales: ['en'],
      defaultLocale: 'en',
      strategy: 'no_prefix',
      detectOrder: [],
      queryParamKey: 'locale',
      injectGlobalProperties: true,
      localeProperties: {
        en: { code: 'en' },
      },
    }

    const head = buildLocaleHead('en', '/', config)
    expect(head.htmlAttrs.dir).toBeUndefined()
  })
})

describe('buildLocaleHead with domains strategy', () => {
  it('generates hreflang links using domain URLs', () => {
    const config: FluentNuxtRuntimeConfig = {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'domains',
      detectOrder: ['domain'],
      queryParamKey: 'locale',
      injectGlobalProperties: true,
      domains: [
        { domain: 'example.com', locale: 'en' },
        { domain: 'example.jp', locale: 'ja' },
      ],
    }

    const head = buildLocaleHead('en', '/about', config, {
      addSeoAttributes: true,
      baseUrl: 'https://example.com',
    })

    expect(head.link.find((l) => l.hreflang === 'en')!.href).toBe('https://example.com/about')
    expect(head.link.find((l) => l.hreflang === 'ja')!.href).toBe('https://example.jp/about')
    expect(head.link.find((l) => l.hreflang === 'x-default')!.href).toBe('https://example.com/about')
  })
})

// ─── T1-1: Canonical link tag ──────────────────────────────────────────────

describe('buildLocaleHead canonical link', () => {
  const config: FluentNuxtRuntimeConfig = {
    locales: ['en', 'ja', 'zh'],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectOrder: ['path', 'cookie'],
    queryParamKey: 'locale',
    injectGlobalProperties: true,
  }

  it('generates canonical link when addSeoAttributes is true (default addCanonical)', () => {
    const head = buildLocaleHead('ja', '/ja/about', config, {
      addSeoAttributes: true,
      baseUrl: 'https://example.com',
    })

    const canonical = head.link.find((l) => l.rel === 'canonical')
    expect(canonical).toBeDefined()
    expect(canonical!.href).toBe('https://example.com/ja/about')
  })

  it('generates canonical link for default locale (no prefix)', () => {
    const head = buildLocaleHead('en', '/about', config, {
      addSeoAttributes: true,
      baseUrl: 'https://example.com',
    })

    const canonical = head.link.find((l) => l.rel === 'canonical')
    expect(canonical).toBeDefined()
    expect(canonical!.href).toBe('https://example.com/about')
  })

  it('skips canonical when addCanonical is false', () => {
    const head = buildLocaleHead('ja', '/ja/about', config, {
      addSeoAttributes: true,
      addCanonical: false,
    })

    const canonical = head.link.find((l) => l.rel === 'canonical')
    expect(canonical).toBeUndefined()
  })

  it('generates canonical with domain strategy', () => {
    const domainConfig: FluentNuxtRuntimeConfig = {
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      strategy: 'domains',
      detectOrder: ['domain'],
      queryParamKey: 'locale',
      injectGlobalProperties: true,
      domains: [
        { domain: 'example.com', locale: 'en' },
        { domain: 'example.jp', locale: 'ja' },
      ],
    }

    const head = buildLocaleHead('ja', '/about', domainConfig, {
      addSeoAttributes: true,
      baseUrl: 'https://example.com',
    })

    const canonical = head.link.find((l) => l.rel === 'canonical')
    expect(canonical).toBeDefined()
    expect(canonical!.href).toBe('https://example.jp/about')
  })

  it('does not generate canonical when addSeoAttributes is false', () => {
    const head = buildLocaleHead('ja', '/ja/about', config)
    const canonical = head.link.find((l) => l.rel === 'canonical')
    expect(canonical).toBeUndefined()
  })
})
