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

    // Should have links for en, ja, zh + x-default = 4
    expect(head.link).toHaveLength(4)

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
