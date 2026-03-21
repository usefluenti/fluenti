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
'use client'

export interface GetLocalePathOptions {
  /** Source/default locale (no prefix in as-needed mode) */
  sourceLocale?: string
}

/**
 * Get the locale-prefixed path for a given pathname and locale.
 *
 * Pure function — works on both server and client.
 *
 * @example
 * ```ts
 * getLocalePath('/about', 'fr')       // → '/fr/about'
 * getLocalePath('/about', 'en')       // → '/about' (source locale, no prefix)
 * getLocalePath('/fr/about', 'en')    // → '/about'
 * getLocalePath('/fr/about', 'ja')    // → '/ja/about'
 * ```
 */
export function getLocalePath(
  pathname: string,
  locale: string,
  options?: GetLocalePathOptions,
): string {
  const sourceLocale = options?.sourceLocale ?? 'en'

  // Strip existing locale prefix if present
  const segments = pathname.split('/')
  const firstSegment = segments[1] ?? ''

  // Check if the first segment looks like a locale (xx, xx-XX, xx-Xxxx script subtag)
  const hasLocalePrefix = /^[a-z]{2}(-[A-Za-z]{2,})?$/.test(firstSegment)
  const pathWithoutLocale = hasLocalePrefix
    ? '/' + segments.slice(2).join('/')
    : pathname

  // Source locale gets no prefix (as-needed mode)
  if (locale === sourceLocale) {
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
}) {
  // These imports are deferred to keep this module usable in both
  // server and client contexts (getLocalePath works everywhere)
  const { useRouter, usePathname } = require('next/navigation') as {
    useRouter(): { push(url: string): void; refresh(): void }
    usePathname(): string
  }
  const { useI18n } = require('@fluenti/react') as {
    useI18n(): { locale: string; setLocale(locale: string): void; getLocales(): string[] }
  }

  const router = useRouter()
  const pathname = usePathname()
  const { locale, setLocale, getLocales } = useI18n()

  // Read locales from I18nProvider context (works on client without fs)
  const locales = getLocales()
  const sourceLocale = options?.sourceLocale ?? locales[0] ?? 'en'

  const switchLocale = (newLocale: string) => {
    // 1. Set cookie to remember preference
    document.cookie = `locale=${newLocale};path=/;max-age=31536000;samesite=lax`
    // 2. Update React context
    setLocale(newLocale)
    // 3. Navigate to new locale path
    const newPath = getLocalePath(pathname, newLocale, { sourceLocale })
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
