import { describe, it, expect } from 'vitest'
import { generateSitemapUrls, createSitemapHook } from '../src/sitemap'

describe('generateSitemapUrls', () => {
  it('generates URLs for all locale variants', () => {
    const urls = generateSitemapUrls(
      ['/about', '/contact'],
      ['en', 'ja'],
      'en',
      'prefix_except_default',
    )

    // 2 paths × 2 locales = 4 URLs
    expect(urls).toHaveLength(4)

    // Default locale has no prefix
    expect(urls.find((u) => u.loc === '/about')).toBeDefined()
    expect(urls.find((u) => u.loc === '/ja/about')).toBeDefined()
    expect(urls.find((u) => u.loc === '/contact')).toBeDefined()
    expect(urls.find((u) => u.loc === '/ja/contact')).toBeDefined()
  })

  it('includes hreflang alternatives for each URL', () => {
    const urls = generateSitemapUrls(
      ['/about'],
      ['en', 'ja'],
      'en',
      'prefix_except_default',
    )

    const enUrl = urls.find((u) => u.loc === '/about')!
    expect(enUrl.alternatives).toBeDefined()
    expect(enUrl.alternatives).toHaveLength(3) // en, ja, x-default
    expect(enUrl.alternatives!.find((a) => a.hreflang === 'en')!.href).toBe('/about')
    expect(enUrl.alternatives!.find((a) => a.hreflang === 'ja')!.href).toBe('/ja/about')
    expect(enUrl.alternatives!.find((a) => a.hreflang === 'x-default')!.href).toBe('/about')
  })

  it('prepends baseUrl to all hrefs', () => {
    const urls = generateSitemapUrls(
      ['/about'],
      ['en', 'ja'],
      'en',
      'prefix_except_default',
      'https://example.com',
    )

    for (const url of urls) {
      expect(url.loc.startsWith('https://example.com')).toBe(true)
      for (const alt of url.alternatives ?? []) {
        expect(alt.href.startsWith('https://example.com')).toBe(true)
      }
    }
  })

  it('handles prefix strategy (all locales get prefix)', () => {
    const urls = generateSitemapUrls(
      ['/'],
      ['en', 'ja'],
      'en',
      'prefix',
    )

    expect(urls).toHaveLength(2)
    expect(urls.find((u) => u.loc === '/en')).toBeDefined()
    expect(urls.find((u) => u.loc === '/ja')).toBeDefined()
  })

  it('handles no_prefix strategy (same path for all)', () => {
    const urls = generateSitemapUrls(
      ['/about'],
      ['en', 'ja'],
      'en',
      'no_prefix',
    )

    // All locales point to the same path
    expect(urls.every((u) => u.loc === '/about')).toBe(true)
  })
})

describe('createSitemapHook', () => {
  it('expands single-locale URLs into multi-locale entries', () => {
    const hook = createSitemapHook(
      ['en', 'ja'],
      'en',
      'prefix_except_default',
      'https://example.com',
    )

    const input = [{ loc: '/about' }, { loc: '/contact' }]
    const result = hook(input)

    // 2 input URLs × 2 locales = 4 output URLs
    expect(result).toHaveLength(4)

    const aboutEn = result.find((u) => u.loc === 'https://example.com/about')
    expect(aboutEn).toBeDefined()
    expect(aboutEn!.alternatives).toHaveLength(3)
  })

  it('returns same URLs for no_prefix strategy', () => {
    const hook = createSitemapHook(
      ['en', 'ja'],
      'en',
      'no_prefix',
    )

    const input = [{ loc: '/about' }]
    const result = hook(input)

    expect(result).toEqual(input)
  })
})
