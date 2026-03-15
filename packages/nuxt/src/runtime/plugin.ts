import { defineNuxtPlugin, useRuntimeConfig, useRoute, useCookie } from '#imports'
import { ref, watch } from 'vue'
import { localePath, extractLocaleFromPath } from './path-utils'
import { runDetectors } from './detectors'
import type { FluentNuxtRuntimeConfig, LocaleDetectContext } from '../types'

/**
 * Nuxt runtime plugin that:
 * 1. Runs the locale detection chain (built-in detectors + custom detectors)
 * 2. Fires the `fluenti:detect-locale` hook for runtime customization
 * 3. Injects `$localePath` into globalProperties
 * 4. Provides reactive `$fluentiLocale` via Nuxt's provide system
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig().public['fluenti'] as FluentNuxtRuntimeConfig
  const route = useRoute()

  // --- Locale detection via detector chain + hook ---
  const detectedLocale = await runDetectors(
    route.path,
    config,
    undefined,
    async (ctx: LocaleDetectContext) => {
      await (nuxtApp.callHook as Function)('fluenti:detect-locale', ctx)
    },
  )
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
