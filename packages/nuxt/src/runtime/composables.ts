import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useRoute, useRuntimeConfig } from '#imports'
import { useI18n } from '@fluenti/vue'
import { localePath, switchLocalePath } from './path-utils'
import type { FluentNuxtRuntimeConfig } from '../types'
import type { LocaleHeadMeta, LocaleHeadOptions } from './locale-head'
import { buildLocaleHead } from './locale-head'

/** Resolve fluenti runtime config from Nuxt's public runtimeConfig */
function useFluentiConfig(): FluentNuxtRuntimeConfig {
  const runtimeConfig = useRuntimeConfig()
  return runtimeConfig.public['fluenti'] as FluentNuxtRuntimeConfig
}

/**
 * Composable that returns a function to generate locale-prefixed paths.
 *
 * Zero-argument — automatically reads the current locale from @fluenti/vue
 * and routing config from Nuxt runtimeConfig.
 *
 * @example
 * ```ts
 * const localePath = useLocalePath()
 * localePath('/about')       // '/ja/about' (current locale is 'ja')
 * localePath('/about', 'en') // '/about' (prefix_except_default, en is default)
 * ```
 */
export function useLocalePath(): (path: string, locale?: string) => string {
  const { locale } = useI18n()
  const config = useFluentiConfig()

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
 * Composable that returns a function to get the current path in a different locale.
 *
 * @example
 * ```ts
 * const switchLocalePath = useSwitchLocalePath()
 * switchLocalePath('en') // '/about' (if on '/ja/about')
 * ```
 */
export function useSwitchLocalePath(): (locale: string) => string {
  const route = useRoute()
  const config = useFluentiConfig()

  return (newLocale: string) => {
    return switchLocalePath(
      route.path,
      newLocale,
      config.locales,
      config.defaultLocale,
      config.strategy,
    )
  }
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
export function useLocaleHead(options?: LocaleHeadOptions): ComputedRef<LocaleHeadMeta> {
  const { locale } = useI18n()
  const route = useRoute()
  const config = useFluentiConfig()

  return computed(() => {
    return buildLocaleHead(locale.value, route.path, config, options)
  })
}
