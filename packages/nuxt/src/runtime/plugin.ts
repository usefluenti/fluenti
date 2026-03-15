import { defineNuxtPlugin, useRuntimeConfig, useRoute, useRequestHeaders, useCookie } from '#imports'
import { ref, watch } from 'vue'
import { localePath, extractLocaleFromPath } from './path-utils'
import type { FluentNuxtRuntimeConfig } from '../types'

/**
 * Nuxt runtime plugin that:
 * 1. Detects the initial locale from the URL path, cookie, or Accept-Language header
 * 2. Injects `$localePath` and `$switchLocalePath` into globalProperties
 * 3. Provides reactive `$fluentiLocale` via Nuxt's provide system
 */
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.fluenti as FluentNuxtRuntimeConfig
  const route = useRoute()

  // --- Locale detection ---
  const detectedLocale = detectInitialLocale(route.path, config)
  const currentLocale = ref(detectedLocale)

  // Sync locale when route changes (path-based detection)
  if (config.strategy !== 'no_prefix') {
    watch(() => route.path, (newPath) => {
      const { locale } = extractLocaleFromPath(newPath, config.locales)
      if (locale) {
        currentLocale.value = locale
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

/**
 * Detect the initial locale using (in order of priority):
 * 1. URL path prefix
 * 2. Cookie value
 * 3. Accept-Language header (SSR only)
 * 4. Default locale
 */
function detectInitialLocale(path: string, config: FluentNuxtRuntimeConfig): string {
  // 1. URL path
  const { locale: pathLocale } = extractLocaleFromPath(path, config.locales)
  if (pathLocale) return pathLocale

  // 2. Cookie (if configured)
  if (config.detectBrowserLanguage?.useCookie) {
    const cookieKey = config.detectBrowserLanguage.cookieKey ?? 'fluenti_locale'
    try {
      const cookie = useCookie(cookieKey)
      if (cookie.value && config.locales.includes(cookie.value)) {
        return cookie.value
      }
    } catch {
      // useCookie may fail outside Nuxt context in tests
    }
  }

  // 3. Accept-Language header (SSR)
  if (import.meta.server) {
    try {
      const headers = useRequestHeaders(['accept-language'])
      const acceptLang = headers['accept-language']
      if (acceptLang) {
        const matched = negotiateLocale(acceptLang, config.locales)
        if (matched) return matched
      }
    } catch {
      // May fail if not in a request context
    }
  }

  // 4. Fallback
  return config.detectBrowserLanguage?.fallbackLocale ?? config.defaultLocale
}

/** Simple Accept-Language negotiation */
function negotiateLocale(acceptLanguage: string, locales: string[]): string | null {
  const preferred = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=')
      return { lang: lang!.trim().toLowerCase(), q: q ? parseFloat(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)

  for (const { lang } of preferred) {
    // Exact match
    if (locales.includes(lang)) return lang
    // Prefix match (e.g., 'en-US' → 'en')
    const prefix = lang.split('-')[0]!
    if (locales.includes(prefix)) return prefix
  }

  return null
}
