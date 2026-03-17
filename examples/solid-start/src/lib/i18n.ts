import type { Locale, Messages } from '@fluenti/core'
import { getHydratedLocale } from '@fluenti/core'
import en from '../locales/compiled/en'
import ja from '../locales/compiled/ja'

export const AVAILABLE_LOCALES: Locale[] = ['en', 'ja']
export const DEFAULT_LOCALE: Locale = 'en'

export const allMessages: Record<string, Messages> = {
  en,
  ja,
}

/**
 * Detect locale from cookie string (server-side).
 * Falls back to DEFAULT_LOCALE if no match.
 */
export function detectLocaleFromCookie(cookieHeader: string | null): Locale {
  if (!cookieHeader) return DEFAULT_LOCALE
  const match = cookieHeader.match(/(?:^|;\s*)locale=([^;]+)/)
  if (match) {
    const candidate = match[1]
    if (AVAILABLE_LOCALES.includes(candidate)) {
      return candidate
    }
  }
  return DEFAULT_LOCALE
}

/**
 * Get the initial locale on the client.
 * Reads from cookie first (set by LanguageSwitcher), then falls back to
 * the SSR-injected window variable, then to DEFAULT_LOCALE.
 */
export function getInitialLocale(): Locale {
  if (typeof document !== 'undefined') {
    const locale = detectLocaleFromCookie(document.cookie)
    if (locale !== DEFAULT_LOCALE) return locale
  }
  return getHydratedLocale(DEFAULT_LOCALE)
}
