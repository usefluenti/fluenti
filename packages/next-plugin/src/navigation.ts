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
   */
  localePrefix?: 'always' | 'as-needed'
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
  localePrefix?: 'always' | 'as-needed'
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
    // 1. Set cookie to remember preference (uses configured cookie name)
    document.cookie = `${cookieName}=${newLocale};path=/;max-age=31536000;samesite=lax`
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
