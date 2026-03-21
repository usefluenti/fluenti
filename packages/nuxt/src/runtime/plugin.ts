import { defineNuxtPlugin, useRuntimeConfig, useRoute, useCookie, useRequestHeaders } from '#imports'
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

  // Hoist useCookie calls BEFORE any await to avoid losing the Nuxt
  // composable context (async local storage is dropped after await).
  const cookieCfg = config.detectBrowserLanguage?.useCookie
    ? config.detectBrowserLanguage
    : null
  const cookieKey = cookieCfg?.cookieKey ?? 'fluenti_locale'
  const localeCookie = cookieCfg ? useCookie(cookieKey) : null

  // Resolve host for domain-based detection
  let host: string | undefined
  if (config.strategy === 'domains') {
    try {
      if (import.meta.server) {
        const headers = useRequestHeaders(['host'])
        host = headers['host']
      } else {
        host = window.location.host
      }
    } catch {
      // host detection failed — domain detector will be skipped
    }
  }

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
      host,
    )
    // Store in payload — Nuxt serializes this to HTML automatically.
    // The client reads it back to ensure hydration uses the same locale.
    nuxtApp.payload['fluentiLocale'] = detectedLocale
  } else if (nuxtApp.payload['fluentiLocale']) {
    // --- Client (SSR hydration): read from payload to avoid mismatch ---
    detectedLocale = nuxtApp.payload['fluentiLocale'] as string
  } else {
    // --- Client (SPA mode / no payload): detect from path and cookie ---
    if (config.strategy === 'domains' && host && config.domains?.length) {
      const cleanHost = host.toLowerCase().replace(/:\d+$/, '')
      const domainMatch = config.domains.find((d) => d.domain.toLowerCase() === cleanHost)
      if (domainMatch) {
        detectedLocale = domainMatch.locale
      } else {
        detectedLocale = config.defaultLocale
      }
    } else {
      const { locale: pathLocale } = extractLocaleFromPath(route.path, config.locales)
      if (pathLocale) {
        detectedLocale = pathLocale
      } else if (localeCookie) {
        detectedLocale = (localeCookie.value && config.locales.includes(localeCookie.value))
          ? localeCookie.value
          : config.defaultLocale
      } else {
        detectedLocale = config.defaultLocale
      }
    }
  }

  const currentLocale = ref(detectedLocale)

  // Sync locale when route changes (path-based detection)
  if (config.strategy !== 'no_prefix' && config.strategy !== 'domains') {
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
  if (localeCookie) {
    watch(currentLocale, (newLocale) => {
      localeCookie.value = newLocale
    })
  }

  // --- Inject global helpers ---
  if (config.injectGlobalProperties) {
    nuxtApp.vueApp.config.globalProperties.$localePath = (path: string, locale?: string) => {
      return localePath(
        path,
        locale ?? currentLocale.value,
        config.defaultLocale,
        config.strategy,
      )
    }
  }

  return {
    provide: {
      fluentiLocale: currentLocale,
      fluentiConfig: config,
    },
  }
})
