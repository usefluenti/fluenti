import { defineNuxtPlugin, useRuntimeConfig, useRoute, useCookie } from '#imports'
import { ref, watch } from 'vue'
import { localePath, extractLocaleFromPath } from './path-utils'
import { runDetectors } from './detectors'
import type { FluentNuxtRuntimeConfig, LocaleDetectContext } from '../types'

/**
 * Nuxt runtime plugin that:
 * 1. Server: runs the locale detection chain, stores locale in payload for hydration
 * 2. Client: reads locale from payload to avoid hydration mismatch
 * 3. Provides reactive locale state and global helpers
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig().public['fluenti'] as FluentNuxtRuntimeConfig
  const route = useRoute()

  let detectedLocale: string

  if (import.meta.server) {
    // --- Server (SSR / SSG / ISR): run full detection chain ---
    detectedLocale = await runDetectors(
      route.path,
      config,
      undefined,
      async (ctx: LocaleDetectContext) => {
        await (nuxtApp.callHook as Function)('fluenti:detect-locale', ctx)
      },
    )
    // Store in payload — Nuxt serializes this to HTML automatically.
    // The client reads it back to ensure hydration uses the same locale.
    nuxtApp.payload['fluentiLocale'] = detectedLocale
  } else {
    // --- Client: read from Nuxt payload to avoid hydration mismatch ---
    detectedLocale = (nuxtApp.payload['fluentiLocale'] as string) ?? config.defaultLocale
  }

  const currentLocale = ref(detectedLocale)

  // Sync locale when route changes (path-based detection)
  if (config.strategy !== 'no_prefix') {
    watch(() => route.path, (newPath) => {
      const { locale } = extractLocaleFromPath(newPath, config.locales)
      if (locale) {
        currentLocale.value = locale
      } else if (config.strategy === 'prefix_except_default') {
        // No locale prefix found — this means we're on a default locale route
        currentLocale.value = config.defaultLocale
      }
    })
  }

  // Persist locale in cookie if detectBrowserLanguage is configured
  if (config.detectBrowserLanguage?.useCookie) {
    const cookieKey = config.detectBrowserLanguage.cookieKey ?? 'fluenti_locale'
    const localeCookie = useCookie(cookieKey)
    watch(currentLocale, (newLocale) => {
      localeCookie.value = newLocale
    })
  }

  // --- Inject global helpers ---
  nuxtApp.vueApp.config.globalProperties.$localePath = (path: string, locale?: string) => {
    return localePath(
      path,
      locale ?? currentLocale.value,
      config.defaultLocale,
      config.strategy,
    )
  }

  return {
    provide: {
      fluentiLocale: currentLocale,
      fluentiConfig: config,
    },
  }
})
