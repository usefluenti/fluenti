import type { Ref, ComputedRef } from 'vue'
import { computed } from 'vue'
import { localePath } from './route-utils'
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
 * Composable that generates locale-aware HTML head metadata.
 *
 * @example
 * ```ts
 * const head = useLocaleHead({ addSeoAttributes: true, baseUrl: 'https://example.com' })
 * useHead(head.value) // Nuxt useHead
 * ```
 */
export function useLocaleHead(
  localeRef: Ref<string>,
  currentPath: Ref<string>,
  config: FluentNuxtRuntimeConfig,
  options?: LocaleHeadOptions,
): ComputedRef<LocaleHeadMeta> {
  return computed(() => {
    const head: LocaleHeadMeta = {
      htmlAttrs: { lang: localeRef.value },
      link: [],
      meta: [],
    }

    if (options?.addSeoAttributes) {
      const baseUrl = options.baseUrl ?? ''

      // hreflang alternate links for each locale
      for (const loc of config.locales) {
        const path = localePath(
          currentPath.value,
          loc,
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
      const defaultPath = localePath(
        currentPath.value,
        config.defaultLocale,
        config.defaultLocale,
        config.strategy,
      )
      head.link.push({
        rel: 'alternate',
        hreflang: 'x-default',
        href: `${baseUrl}${defaultPath}`,
      })

      // og:locale
      head.meta.push({ property: 'og:locale', content: localeRef.value })

      // og:locale:alternate for other locales
      for (const loc of config.locales) {
        if (loc !== localeRef.value) {
          head.meta.push({ property: 'og:locale:alternate', content: loc })
        }
      }
    }

    return head
  })
}
