import type { Ref } from 'vue'
import { localePath, switchLocalePath } from './route-utils'
import type { FluentNuxtRuntimeConfig } from '../types'

/**
 * Composable that returns a function to generate locale-prefixed paths.
 *
 * @example
 * ```ts
 * const localePath = useLocalePath()
 * localePath('/about')       // '/ja/about' (current locale is 'ja')
 * localePath('/about', 'en') // '/about' (prefix_except_default, en is default)
 * ```
 */
export function useLocalePath(
  localeRef: Ref<string>,
  config: FluentNuxtRuntimeConfig,
): (path: string, locale?: string) => string {
  return (path: string, targetLocale?: string) => {
    return localePath(
      path,
      targetLocale ?? localeRef.value,
      config.defaultLocale,
      config.strategy,
    )
  }
}

/**
 * Composable that returns a function to get the current path in a different locale.
 *
 * @example
 * ```ts
 * const switchLocalePath = useSwitchLocalePath()
 * switchLocalePath('en') // '/about' (if on '/ja/about')
 * ```
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
