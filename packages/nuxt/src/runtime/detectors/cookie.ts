import { useCookie } from '#imports'
import type { LocaleDetectContext } from '../../types'

/** Detect locale from cookie value */
export default function detectCookie(ctx: LocaleDetectContext): void {
  if (!ctx.detectBrowserLanguage?.useCookie) return
  const cookieKey = ctx.detectBrowserLanguage.cookieKey ?? 'fluenti_locale'
  try {
    const cookie = useCookie(cookieKey)
    if (cookie.value && ctx.locales.includes(cookie.value)) {
      ctx.setLocale(cookie.value)
    }
  } catch {
    // useCookie may fail outside Nuxt context
  }
}
