import { useCookie } from '#imports'
import type { LocaleDetectContext } from '../../types'

/** Detect locale from cookie value */
export default function detectCookie(ctx: LocaleDetectContext): void {
  if (!ctx.detectBrowserLanguage?.useCookie) return

  // Prefer pre-read cookie value from plugin (hoisted before await)
  if (ctx.cookieValue !== undefined) {
    if (ctx.cookieValue && ctx.locales.includes(ctx.cookieValue)) {
      ctx.setLocale(ctx.cookieValue)
    }
    return
  }

  // Fallback: read cookie directly (works when called synchronously in plugin context)
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
