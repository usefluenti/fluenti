import { cookies, headers } from 'next/headers'

const locales = ['en', 'zh-CN', 'ja']
const defaultLocale = 'en'

/**
 * Custom locale resolver for Server Actions and other contexts
 * where I18nProvider doesn't run.
 *
 * Checks the URL path first (set by middleware), then the cookie,
 * then falls back to the default locale.
 */
export default async function resolveLocale(): Promise<string> {
  // Try path-based locale from the referer header
  const headerStore = await headers()
  const referer = headerStore.get('referer')
  if (referer) {
    try {
      const url = new URL(referer)
      const pathLocale = url.pathname.split('/')[1]
      if (pathLocale && locales.includes(pathLocale)) {
        return pathLocale
      }
    } catch {
      // Invalid referer URL — fall through
    }
  }

  // Fallback to cookie
  const cookieStore = await cookies()
  return cookieStore.get('locale')?.value ?? defaultLocale
}
