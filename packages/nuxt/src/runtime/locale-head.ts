import { switchLocalePath } from './path-utils'
import type { FluentNuxtRuntimeConfig } from '../types'

/**
 * Safely construct an href from a base URL and path.
 * Guards against protocol injection and malformed URLs.
 */
function buildSafeHref(baseUrl: string, path: string): string {
  if (!baseUrl) return path
  try {
    const url = new URL(path, baseUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return path
    }
    return url.href
  } catch {
    return path
  }
}

/** Head metadata for locale SEO */
export interface LocaleHeadMeta {
  htmlAttrs: { lang: string; dir?: string }
  link: Array<{ rel: string; hreflang: string; href: string }>
  meta: Array<{ property: string; content: string }>
}

export interface LocaleHeadOptions {
  /** Add hreflang and og:locale SEO attributes */
  addSeoAttributes?: boolean
  /** Base URL for absolute hreflang links (e.g. 'https://example.com') */
  baseUrl?: string
  /** Add a canonical link tag for the current page (default: true when addSeoAttributes is true) */
  addCanonical?: boolean
}

/**
 * Pure function that builds locale-aware HTML head metadata.
 *
 * This is the framework-agnostic core logic. For the Nuxt composable,
 * use `useLocaleHead()` from `composables.ts` instead.
 */
export function buildLocaleHead(
  locale: string,
  currentPath: string,
  config: FluentNuxtRuntimeConfig,
  options?: LocaleHeadOptions,
): LocaleHeadMeta {
  const props = config.localeProperties?.[locale]
  const isoTag = props?.iso ?? locale

  const head: LocaleHeadMeta = {
    htmlAttrs: {
      lang: isoTag,
      ...(props?.dir ? { dir: props.dir } : {}),
    },
    link: [],
    meta: [],
  }

  if (options?.addSeoAttributes) {
    const baseUrl = options.baseUrl ?? ''

    // Memoize domain lookups to avoid repeated .find() calls
    const domainMap = config.domains?.length
      ? new Map(config.domains.map(d => [d.locale, d]))
      : null

    // hreflang alternate links for each locale
    for (const loc of config.locales) {
      const locProps = config.localeProperties?.[loc]
      const locIso = locProps?.iso ?? loc

      if (config.strategy === 'domains' && domainMap) {
        // For domain strategy, build absolute URLs using domain configs
        const domainEntry = domainMap?.get(loc)
        if (domainEntry) {
          const protocol = baseUrl.startsWith('https') ? 'https' : 'http'
          head.link.push({
            rel: 'alternate',
            hreflang: locIso,
            href: buildSafeHref(`${protocol}://${domainEntry.domain}`, currentPath),
          })
        }
      } else {
        const path = switchLocalePath(
          currentPath,
          loc,
          config.locales,
          config.defaultLocale,
          config.strategy,
        )
        head.link.push({
          rel: 'alternate',
          hreflang: locIso,
          href: buildSafeHref(baseUrl, path),
        })
      }
    }

    // x-default hreflang
    if (config.strategy === 'domains' && domainMap) {
      const defaultDomain = domainMap?.get(config.defaultLocale)
      if (defaultDomain) {
        const protocol = baseUrl.startsWith('https') ? 'https' : 'http'
        head.link.push({
          rel: 'alternate',
          hreflang: 'x-default',
          href: buildSafeHref(`${protocol}://${defaultDomain.domain}`, currentPath),
        })
      }
    } else {
      const defaultPath = switchLocalePath(
        currentPath,
        config.defaultLocale,
        config.locales,
        config.defaultLocale,
        config.strategy,
      )
      head.link.push({
        rel: 'alternate',
        hreflang: 'x-default',
        href: buildSafeHref(baseUrl, defaultPath),
      })
    }

    // Canonical link tag (defaults to true when addSeoAttributes is enabled)
    if (options.addCanonical !== false) {
      if (config.strategy === 'domains' && domainMap) {
        const domainEntry = domainMap?.get(locale)
        if (domainEntry) {
          const protocol = baseUrl.startsWith('https') ? 'https' : 'http'
          head.link.push({
            rel: 'canonical',
            hreflang: '',
            href: buildSafeHref(`${protocol}://${domainEntry.domain}`, currentPath),
          })
        }
      } else {
        const canonicalPath = switchLocalePath(
          currentPath,
          locale,
          config.locales,
          config.defaultLocale,
          config.strategy,
        )
        head.link.push({
          rel: 'canonical',
          hreflang: '',
          href: buildSafeHref(baseUrl, canonicalPath),
        })
      }
    }

    // og:locale (use ISO tag if available)
    head.meta.push({ property: 'og:locale', content: isoTag })

    // og:locale:alternate for other locales
    for (const loc of config.locales) {
      if (loc !== locale) {
        const locProps = config.localeProperties?.[loc]
        head.meta.push({
          property: 'og:locale:alternate',
          content: locProps?.iso ?? loc,
        })
      }
    }
  }

  return head
}
