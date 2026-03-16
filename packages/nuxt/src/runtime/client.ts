// Browser-safe exports — no Nuxt auto-imports (#imports) dependency.
// Use this entry point in non-Nuxt environments (e.g. plain Vue SPA).

import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { localePath, switchLocalePath } from './path-utils'
import { buildLocaleHead } from './locale-head'
import type { LocaleHeadMeta, LocaleHeadOptions } from './locale-head'
import type { FluentNuxtRuntimeConfig } from '../types'

// Path utilities (pure functions, framework-agnostic)
export { localePath, extractLocaleFromPath, switchLocalePath } from './path-utils'

// Page route extension (build-time utility)
export { extendPages } from './page-extend'
export type { PageRoute } from './page-extend'

// Locale head (pure function)
export { buildLocaleHead } from './locale-head'
export type { LocaleHeadMeta, LocaleHeadOptions } from './locale-head'

// Re-export types
export type { FluentNuxtRuntimeConfig } from '../types'

/**
 * Browser-safe composable for locale-prefixed paths.
 * Accepts explicit locale and config instead of using Nuxt auto-imports.
 */
export function useLocalePath(
  locale: Ref<string>,
  config: FluentNuxtRuntimeConfig,
): (path: string, targetLocale?: string) => string {
  return (path: string, targetLocale?: string) => {
    return localePath(
      path,
      targetLocale ?? locale.value,
      config.defaultLocale,
      config.strategy,
    )
  }
}

/**
 * Browser-safe composable for switching locale paths.
 * Accepts explicit currentPath and config instead of using Nuxt auto-imports.
 */
export function useSwitchLocalePath(
  currentPath: Ref<string> | ComputedRef<string>,
  config: FluentNuxtRuntimeConfig,
): (locale: string) => string {
  return (newLocale: string) => {
    return switchLocalePath(
      currentPath.value,
      newLocale,
      config.locales,
      config.defaultLocale,
      config.strategy,
    )
  }
}

/**
 * Browser-safe composable for locale head metadata.
 * Accepts explicit locale, currentPath, and config instead of using Nuxt auto-imports.
 */
export function useLocaleHead(
  locale: Ref<string>,
  currentPath: Ref<string> | ComputedRef<string>,
  config: FluentNuxtRuntimeConfig,
  options?: LocaleHeadOptions,
): ComputedRef<LocaleHeadMeta> {
  return computed(() => {
    return buildLocaleHead(locale.value, currentPath.value, config, options)
  })
}
