import { switchLocalePath } from './path-utils'
import type { FluentNuxtRuntimeConfig } from '../types'

/** Head metadata for locale SEO */
export interface LocaleHeadMeta {
  htmlAttrs: { lang: string }
  link: Array<{ rel: string; hreflang: string; href: string }>
  meta: Array<{ property: string; content: string }>
}

export interface LocaleHeadOptions {
  /** Add hreflang and og:locale SEO attributes */
  addSeoAttributes?: boolean
  /** Base URL for absolute hreflang links (e.g. 'https://example.com') */
  baseUrl?: string
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
  const head: LocaleHeadMeta = {
    htmlAttrs: { lang: locale },
    link: [],
    meta: [],
  }

  if (options?.addSeoAttributes) {
    const baseUrl = options.baseUrl ?? ''

    // hreflang alternate links for each locale
    for (const loc of config.locales) {
      const path = switchLocalePath(
        currentPath,
        loc,
        config.locales,
        config.defaultLocale,
        config.strategy,
      )
      head.link.push({
        rel: 'alternate',
        hreflang: loc,
        href: `${baseUrl}${path}`,
      })
    }

    // x-default hreflang
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
      href: `${baseUrl}${defaultPath}`,
    })

    // og:locale
    head.meta.push({ property: 'og:locale', content: locale })

    // og:locale:alternate for other locales
    for (const loc of config.locales) {
      if (loc !== locale) {
        head.meta.push({ property: 'og:locale:alternate', content: loc })
      }
    }
  }

  return head
}
