import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { localePath, switchLocalePath } from './path-utils'
import type { FluentNuxtRuntimeConfig } from '../types'
import type { LocaleHeadMeta, LocaleHeadOptions } from './locale-head'
import { buildLocaleHead } from './locale-head'

/**
 * Standalone composable for locale-prefixed paths (no Nuxt dependency).
 * Accepts explicit locale ref and config instead of reading from Nuxt context.
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
 * Standalone composable for switch-locale paths (no Nuxt dependency).
 * Accepts explicit current path ref and config.
 */
export function useSwitchLocalePath(
  currentPath: Ref<string>,
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
 * Standalone composable for locale-aware head metadata (no Nuxt dependency).
 * Accepts explicit locale, path, and config refs.
 */
export function useLocaleHead(
  locale: Ref<string>,
  currentPath: Ref<string>,
  config: FluentNuxtRuntimeConfig,
  options?: LocaleHeadOptions,
): ComputedRef<LocaleHeadMeta> {
  return computed(() => {
    return buildLocaleHead(locale.value, currentPath.value, config, options)
  })
}
