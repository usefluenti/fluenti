export const AVAILABLE_LOCALES = ['en', 'zh-CN', 'ja'] as const

export function isSupportedLocale(
  locale: string,
  availableLocales: readonly string[],
): boolean {
  return availableLocales.includes(locale)
}

export function getQueryLocale(
  search: string,
  availableLocales: readonly string[],
): string | null {
  const queryLang = new URLSearchParams(search).get('lang')
  if (!queryLang) return null
  return isSupportedLocale(queryLang, availableLocales) ? queryLang : null
}

export function getCookieLocale(
  cookieHeader: string,
  availableLocales: readonly string[],
): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)locale=([^;]*)/)
  if (!match?.[1]) return null

  let locale = match[1]
  try {
    locale = decodeURIComponent(locale)
  } catch {
    // Ignore decode failures and validate the raw value instead.
  }

  return isSupportedLocale(locale, availableLocales) ? locale : null
}

export function serializeLocaleCookie(locale: string): string {
  return `locale=${encodeURIComponent(locale)};path=/;max-age=31536000`
}
