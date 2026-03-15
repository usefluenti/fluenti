import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig, useCookie, useRequestHeaders } from '#imports'
import { extractLocaleFromPath, localePath } from '../path-utils'
import type { FluentNuxtRuntimeConfig } from '../../types'

/**
 * Route middleware that redirects users to locale-prefixed URLs
 * based on their browser language preference or persisted cookie.
 *
 * Only active when strategy is not 'no_prefix'.
 * Skips redirect when the URL already contains a valid locale prefix.
 */
export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig().public.fluenti as FluentNuxtRuntimeConfig

  if (config.strategy === 'no_prefix') return

  // If the path already has a locale prefix, do nothing
  const { locale: pathLocale } = extractLocaleFromPath(to.path, config.locales)
  if (pathLocale) return

  // For prefix_except_default / prefix_and_default, an unprefixed path
  // means the default locale — no redirect needed for prefix_except_default
  if (config.strategy === 'prefix_except_default') return

  // For 'prefix' strategy, we must redirect to a locale-prefixed URL
  const detectedLocale = detectRedirectLocale(config)
  const targetPath = localePath(to.path, detectedLocale, config.defaultLocale, config.strategy)

  if (targetPath !== to.path) {
    return navigateTo(targetPath, { redirectCode: 302 })
  }
})

function detectRedirectLocale(config: FluentNuxtRuntimeConfig): string {
  // 1. Cookie
  if (config.detectBrowserLanguage?.useCookie) {
    const cookieKey = config.detectBrowserLanguage.cookieKey ?? 'fluenti_locale'
    try {
      const cookie = useCookie(cookieKey)
      if (cookie.value && config.locales.includes(cookie.value)) {
        return cookie.value
      }
    } catch {
      // ignore
    }
  }

  // 2. Accept-Language (SSR only)
  if (import.meta.server) {
    try {
      const headers = useRequestHeaders(['accept-language'])
      const acceptLang = headers['accept-language']
      if (acceptLang) {
        const preferred = acceptLang
          .split(',')
          .map((part) => {
            const [lang, q] = part.trim().split(';q=')
            return { lang: lang!.trim().toLowerCase(), q: q ? parseFloat(q) : 1 }
          })
          .sort((a, b) => b.q - a.q)

        for (const { lang } of preferred) {
          if (config.locales.includes(lang)) return lang
          const prefix = lang.split('-')[0]!
          if (config.locales.includes(prefix)) return prefix
        }
      }
    } catch {
      // ignore
    }
  }

  return config.detectBrowserLanguage?.fallbackLocale ?? config.defaultLocale
}
