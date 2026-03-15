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
 * Get the initial locale: from hydrated value on client, fallback on server.
 */
export function getInitialLocale(): Locale {
  return getHydratedLocale(DEFAULT_LOCALE)
}
