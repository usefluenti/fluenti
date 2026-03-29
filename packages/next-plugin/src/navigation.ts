'use client'

/**
 * @module @fluenti/next/navigation
 *
 * Navigation utilities for locale-aware routing in Next.js App Router.
 *
 * @example
 * ```tsx
 * import { useLocaleSwitcher } from '@fluenti/next/navigation'
 *
 * function LanguagePicker() {
 *   const { switchLocale, currentLocale, locales } = useLocaleSwitcher()
 *   return (
 *     <select value={currentLocale} onChange={(e) => switchLocale(e.target.value)}>
 *       {locales.map((l) => <option key={l} value={l}>{l}</option>)}
 *     </select>
 *   )
 * }
 * ```
 */
import { useRouter, usePathname } from 'next/navigation'
import { useI18n } from '@fluenti/react'
import { cookieName as _configCookieName } from '@fluenti/next/i18n-config'

export interface GetLocalePathOptions {
  /** Source/default locale (no prefix in as-needed mode) */
  sourceLocale?: string
  /**
   * Known locale codes (e.g. ['en', 'fr', 'ja']).
   * When provided, the existing prefix is only stripped when it's an actual locale —
   * preventing false matches on generic 2-letter path segments like /my or /us.
   */
  locales?: string[]
  /**
   * Locale prefix strategy. Matches the middleware `localePrefix` setting.
   * - `'as-needed'` (default): source locale has no prefix (`/about` for en, `/fr/about` for fr)
   * - `'always'`: all locales get a prefix (`/en/about`, `/fr/about`)
   * - `'never'`: no locale prefix in URLs
   */
  localePrefix?: 'always' | 'as-needed' | 'never'
}

/**
 * Get the locale-prefixed path for a given pathname and locale.
 *
 * Pure function — works on both server and client.
 *
 * @example
 * ```ts
 * getLocalePath('/about', 'fr')                           // → '/fr/about'
 * getLocalePath('/about', 'en')                           // → '/about' (source locale, no prefix)
 * getLocalePath('/fr/about', 'en')                        // → '/about'
 * getLocalePath('/fr/about', 'ja')                        // → '/ja/about'
 * getLocalePath('/about', 'en', { localePrefix: 'always' }) // → '/en/about'
 * ```
 */
export function getLocalePath(
  pathname: string,
  locale: string,
  options?: GetLocalePathOptions,
): string {
  const sourceLocale = options?.sourceLocale ?? 'en'
  const localePrefix = options?.localePrefix ?? 'as-needed'

  // Strip existing locale prefix if present
  const segments = pathname.split('/')
  const firstSegment = segments[1] ?? ''

  // Check if the first segment is a locale prefix.
  // If a locales list is provided, do an exact membership check to avoid false positives
  // on generic 2-letter path segments (e.g. /my/page or /us/pricing).
  // Otherwise fall back to the heuristic regex.
  const hasLocalePrefix = options?.locales
    ? options.locales.includes(firstSegment)
    : /^[a-z]{2}(-[A-Za-z]{2,})?$/.test(firstSegment)
  const pathWithoutLocale = hasLocalePrefix
    ? '/' + segments.slice(2).join('/')
    : pathname

  // 'never' mode: no prefix for any locale
  if (localePrefix === 'never') {
    return pathWithoutLocale || '/'
  }

  // In 'as-needed' mode, source locale gets no prefix
  if (localePrefix !== 'always' && locale === sourceLocale) {
    return pathWithoutLocale || '/'
  }

  return `/${locale}${pathWithoutLocale}`
}

/**
 * Hook for switching locales in Next.js App Router.
 *
 * Sets a cookie to remember user preference, navigates to the new locale path,
 * and triggers a server component refresh.
 */
export function useLocaleSwitcher(options?: {
  /** Override the source/default locale instead of inferring from locales[0]. */
  sourceLocale?: string
  /**
   * Cookie name used by the middleware for locale preference.
   * Defaults to the value from `fluenti.config.ts` (auto-read at build time).
   * Must match the middleware `cookieName` option.
   */
  cookieName?: string
  /** Locale prefix strategy — must match the middleware `localePrefix` option. */
  localePrefix?: 'always' | 'as-needed' | 'never'
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { locale, setLocale, getLocales } = useI18n()

  // Read locales from I18nProvider context (works on client without fs)
  const locales = getLocales()
  const sourceLocale = options?.sourceLocale ?? locales[0] ?? 'en'
  const cookieName = options?.cookieName ?? _configCookieName
  const localePrefix = options?.localePrefix ?? 'as-needed'

  const switchLocale = (newLocale: string) => {
    // Validate locale against known locales to prevent cookie injection
    if (!locales.includes(newLocale)) {
      if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] !== 'production') {
        console.warn(`[fluenti] switchLocale: invalid locale "${newLocale}"`)
      }
      return
    }
    // 1. Set cookie to remember preference (uses configured cookie name)
    document.cookie = `${cookieName}=${encodeURIComponent(newLocale)};path=/;max-age=31536000;samesite=lax`
    // 2. Update React context
    setLocale(newLocale)
    // 3. Navigate to new locale path
    const newPath = getLocalePath(pathname, newLocale, { sourceLocale, locales, localePrefix })
    router.push(newPath)
    // 4. Refresh server components
    router.refresh()
  }

  return {
    switchLocale,
    currentLocale: locale,
    locales,
    sourceLocale,
  }
}

// Re-export createNavigation and routing utilities
export { createNavigation } from './create-navigation'
export { defineRouting, resolveLocalizedPath } from './routing'
export type { RoutingConfig } from './routing'

// ── useAlternateLinks ─────────────────────────────────────────────────────

export interface AlternateLink {
  hreflang: string
  href: string
}

/**
 * Generate alternate link entries for SEO `<head>` tags.
 *
 * Returns an array of `{ hreflang, href }` entries for all configured locales
 * plus `x-default`. Use in `<head>` for hreflang tags.
 *
 * @example
 * ```tsx
 * import { useAlternateLinks } from '@fluenti/next/navigation'
 * import { routing } from '@/i18n/routing'
 *
 * export function Head() {
 *   const links = useAlternateLinks({ routing, baseUrl: 'https://example.com' })
 *   return (
 *     <head>
 *       {links.map(l => (
 *         <link key={l.hreflang} rel="alternate" hreflang={l.hreflang} href={l.href} />
 *       ))}
 *     </head>
 *   )
 * }
 * ```
 */
export function useAlternateLinks(options: {
  routing: { locales: readonly string[]; sourceLocale: string; localePrefix?: 'always' | 'as-needed' | 'never'; pathnames?: Record<string, Record<string, string>> }
  baseUrl?: string
}): AlternateLink[] {
  const { routing: r, baseUrl = '' } = options
  const pathname = usePathname()
  // Strip locale prefix from current path
  const segments = pathname.split('/')
  const firstSeg = segments[1] ?? ''
  const isLocalePrefix = (r.locales as string[]).some(l => l.toLowerCase() === firstSeg.toLowerCase())
  const cleanPath = isLocalePrefix ? '/' + segments.slice(2).join('/') || '/' : pathname

  const links: AlternateLink[] = (r.locales as string[]).map(loc => {
    let localePath = cleanPath
    if (r.pathnames) {
      const { resolveLocalizedPath: resolve } = require('./routing') as typeof import('./routing')
      const mapped = resolve(cleanPath, loc, r.pathnames as Record<string, Record<string, string>>)
      if (mapped) localePath = mapped
    }

    let href: string
    if (r.localePrefix === 'never') {
      href = `${baseUrl}${localePath}`
    } else if (r.localePrefix !== 'always' && loc === r.sourceLocale) {
      href = `${baseUrl}${localePath}`
    } else {
      href = `${baseUrl}/${loc}${localePath}`
    }

    return { hreflang: loc, href }
  })

  // x-default
  const defaultPath = r.localePrefix === 'always' ? `${baseUrl}/${r.sourceLocale}${cleanPath}` : `${baseUrl}${cleanPath}`
  links.push({ hreflang: 'x-default', href: defaultPath })

  return links
}
