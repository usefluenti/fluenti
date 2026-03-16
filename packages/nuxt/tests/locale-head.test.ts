import { describe, it, expect } from 'vitest'
import { buildLocaleHead } from '../src/runtime/locale-head'
import type { FluentNuxtRuntimeConfig } from '../src/types'

describe('buildLocaleHead', () => {
  const config: FluentNuxtRuntimeConfig = {
    locales: ['en', 'ja', 'zh'],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
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
