import type { Strategy } from './types'

export interface SitemapUrl {
  loc: string
  alternatives?: Array<{ hreflang: string; href: string }>
}

/**
 * Generate multi-locale sitemap URLs from a list of base paths.
 *
 * For each base path, produces a URL entry with hreflang alternatives
 * pointing to every locale variant. Compatible with `@nuxtjs/sitemap`'s
 * `sources` hook format.
 */
export function generateSitemapUrls(
  paths: string[],
  locales: string[],
  defaultLocale: string,
  strategy: Strategy,
  baseUrl?: string,
): SitemapUrl[] {
  const urls: SitemapUrl[] = []
  const base = baseUrl ?? ''

  for (const rawPath of paths) {
    const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`

    for (const locale of locales) {
      const localizedPath = buildLocalePath(path, locale, defaultLocale, strategy)

      const alternatives = locales.map((altLocale) => ({
        hreflang: altLocale,
        href: `${base}${buildLocalePath(path, altLocale, defaultLocale, strategy)}`,
      }))

      // Add x-default pointing to default locale
      alternatives.push({
        hreflang: 'x-default',
        href: `${base}${buildLocalePath(path, defaultLocale, defaultLocale, strategy)}`,
      })

      urls.push({
        loc: `${base}${localizedPath}`,
        alternatives,
      })
    }
  }

  return urls
}

function buildLocalePath(
  path: string,
  locale: string,
  defaultLocale: string,
  strategy: Strategy,
): string {
  if (strategy === 'no_prefix') return path

  if (strategy === 'prefix_except_default' && locale === defaultLocale) {
    return path
  }

  const cleanPath = path === '/' ? '' : path
  return `/${locale}${cleanPath}`
}

/**
 * Hook handler for `@nuxtjs/sitemap`'s `sitemap:generate` hook.
 *
 * Transforms single-locale URLs into multi-locale entries with hreflang.
 * Register this in your nuxt.config.ts or let the module auto-register it.
 */
export function createSitemapHook(
  locales: string[],
  defaultLocale: string,
  strategy: Strategy,
  baseUrl?: string,
) {
  return (urls: SitemapUrl[]) => {
    if (strategy === 'no_prefix') return urls

    const expanded: SitemapUrl[] = []

    for (const url of urls) {
      const loc = url.loc.replace(/^https?:\/\/[^/]+/, '')

      for (const locale of locales) {
        const localizedPath = buildLocalePath(loc, locale, defaultLocale, strategy)
        const alternatives = locales.map((altLocale) => ({
          hreflang: altLocale,
          href: `${baseUrl ?? ''}${buildLocalePath(loc, altLocale, defaultLocale, strategy)}`,
        }))
        alternatives.push({
          hreflang: 'x-default',
          href: `${baseUrl ?? ''}${buildLocalePath(loc, defaultLocale, defaultLocale, strategy)}`,
        })

        expanded.push({
          loc: `${baseUrl ?? ''}${localizedPath}`,
          alternatives,
        })
      }
    }

    return expanded
  }
}
