import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useLocaleHead } from '../src/runtime/locale-head'
import type { FluentNuxtRuntimeConfig } from '../src/types'

describe('useLocaleHead', () => {
  const config: FluentNuxtRuntimeConfig = {
    locales: ['en', 'ja', 'zh'],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
  }

  it('sets htmlAttrs.lang to current locale', () => {
    const locale = ref('ja')
    const path = ref('/ja/about')

    const head = useLocaleHead(locale, path, config)

    expect(head.value.htmlAttrs.lang).toBe('ja')
  })

  it('updates lang when locale changes', () => {
    const locale = ref('en')
    const path = ref('/about')

    const head = useLocaleHead(locale, path, config)
    expect(head.value.htmlAttrs.lang).toBe('en')

    locale.value = 'zh'
    expect(head.value.htmlAttrs.lang).toBe('zh')
  })

  it('returns empty link/meta when addSeoAttributes is false', () => {
    const locale = ref('en')
    const path = ref('/about')

    const head = useLocaleHead(locale, path, config)

    expect(head.value.link).toEqual([])
    expect(head.value.meta).toEqual([])
  })

  it('generates hreflang links when addSeoAttributes is true', () => {
    const locale = ref('en')
    const path = ref('/about')

    const head = useLocaleHead(locale, path, config, { addSeoAttributes: true })

    // Should have links for en, ja, zh + x-default = 4
    expect(head.value.link).toHaveLength(4)

    expect(head.value.link).toContainEqual({
      rel: 'alternate',
      hreflang: 'en',
      href: '/about',
    })
    expect(head.value.link).toContainEqual({
      rel: 'alternate',
      hreflang: 'ja',
      href: '/ja/about',
    })
    expect(head.value.link).toContainEqual({
      rel: 'alternate',
      hreflang: 'zh',
      href: '/zh/about',
    })
    expect(head.value.link).toContainEqual({
      rel: 'alternate',
      hreflang: 'x-default',
      href: '/about',
    })
  })

  it('includes baseUrl in hreflang hrefs', () => {
    const locale = ref('en')
    const path = ref('/about')

    const head = useLocaleHead(locale, path, config, {
      addSeoAttributes: true,
      baseUrl: 'https://example.com',
    })

    expect(head.value.link[0]!.href).toBe('https://example.com/about')
    expect(head.value.link[1]!.href).toBe('https://example.com/ja/about')
  })

  it('generates og:locale meta tags', () => {
    const locale = ref('ja')
    const path = ref('/ja/about')

    const head = useLocaleHead(locale, path, config, { addSeoAttributes: true })

    expect(head.value.meta).toContainEqual({
      property: 'og:locale',
      content: 'ja',
    })

    // Should have og:locale:alternate for other locales
    const alternates = head.value.meta.filter((m) => m.property === 'og:locale:alternate')
    expect(alternates).toHaveLength(2)
    expect(alternates.map((m) => m.content).sort()).toEqual(['en', 'zh'])
  })
})
