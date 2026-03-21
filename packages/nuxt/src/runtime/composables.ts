import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useRoute, useRouter, useRuntimeConfig } from '#imports'
import type { RouteLocationRaw, RouteLocationResolved } from 'vue-router'
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
 * Composable that returns a function to resolve a locale-prefixed route object.
 *
 * Unlike `useLocalePath()` which returns a path string, this returns a full
 * resolved `RouteLocationResolved` that can be passed to `router.push()`.
 *
 * @example
 * ```ts
 * const localeRoute = useLocaleRoute()
 * const route = localeRoute('/about')       // resolved route for '/ja/about'
 * const route = localeRoute('/about', 'en') // resolved route for '/about'
 * router.push(route)
 * ```
 */
export function useLocaleRoute(): (to: RouteLocationRaw, locale?: string) => RouteLocationResolved {
  const { locale } = useI18n()
  const router = useRouter()
  const config = useFluentiConfig()

  return (to: RouteLocationRaw, targetLocale?: string) => {
    const resolvedLocale = targetLocale ?? locale.value
    if (typeof to === 'string') {
      const path = localePath(to, resolvedLocale, config.defaultLocale, config.strategy)
      return router.resolve(path)
    }
    // For object routes, prefix the path if present
    if ('path' in to && to.path) {
      const path = localePath(to.path, resolvedLocale, config.defaultLocale, config.strategy)
      return router.resolve({ ...to, path })
    }
    // For named routes, resolve as-is
    return router.resolve(to)
  }
}

/**
 * Composable that returns a namespace-scoped i18n context.
 *
 * The `t()` function automatically prepends the namespace to message keys,
 * reducing boilerplate when a component only uses messages from one section.
 *
 * @example
 * ```ts
 * const { t } = useI18nScoped('Navbar')
 * t('home')     // looks up 'Navbar.home'
 * t('about')    // looks up 'Navbar.about'
 * ```
 */
export function useI18nScoped(namespace: string) {
  const ctx = useI18n()
  const separator = '.'

  return {
    ...ctx,
    t(idOrDescriptor: unknown, values?: Record<string, unknown>): string {
      if (typeof idOrDescriptor === 'string') {
        return ctx.t(`${namespace}${separator}${idOrDescriptor}`, values)
      }
      // MessageDescriptor — prefix the id
      if (idOrDescriptor && typeof idOrDescriptor === 'object' && 'id' in idOrDescriptor) {
        const desc = idOrDescriptor as { id: string }
        return ctx.t({ ...desc, id: `${namespace}${separator}${desc.id}` }, values)
      }
      // Tagged template — pass through (no namespacing for tagged templates)
      return (ctx.t as Function)(idOrDescriptor, values)
    },
    te(key: string, locale?: string): boolean {
      return ctx.te(`${namespace}${separator}${key}`, locale)
    },
    tm(key: string, locale?: string) {
      return ctx.tm(`${namespace}${separator}${key}`, locale)
    },
    /** The namespace this context is scoped to */
    namespace,
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
