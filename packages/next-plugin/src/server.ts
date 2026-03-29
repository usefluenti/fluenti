/**
 * @module @fluenti/next/server
 *
 * Server-side utilities for Next.js App Router.
 *
 * @example
 * ```tsx
 * import { getLocale, setRequestLocale } from '@fluenti/next/server'
 *
 * export default async function Page({ params }) {
 *   const { locale } = await params
 *   setRequestLocale(locale)
 *   const currentLocale = await getLocale()
 * }
 * ```
 */

import { cache } from 'react'

export { withLocale } from './with-locale'

// ── Request-scoped locale store (React.cache) ─────────────────────────────

const getRequestStore = cache(() => ({ locale: '' }))

/**
 * Set the locale for the current request scope.
 *
 * Call this at the top of page/layout components to enable static rendering.
 * Required for `generateStaticParams` pages where no middleware header is available.
 */
export function setRequestLocale(locale: string): void {
  getRequestStore().locale = locale
}

/**
 * Get the current locale in a Server Component.
 *
 * Resolution: setRequestLocale() → x-fluenti-locale header → 'en'
 */
export async function getLocale(): Promise<string> {
  const store = getRequestStore()
  if (store.locale) return store.locale

  try {
    const { headers } = await import('next/headers')
    const h = await (headers as () => Promise<{ get(name: string): string | null }>)()
    const headerLocale = h.get('x-fluenti-locale')
    if (headerLocale) return headerLocale
  } catch {
    // headers() not available during static generation
  }

  return 'en'
}

/**
 * Generate static params for all configured locales.
 *
 * @example
 * ```tsx
 * export function generateStaticParams() {
 *   return generateLocaleParams(['en', 'ja', 'zh-CN'])
 * }
 * ```
 */
export function generateLocaleParams(locales: string[]): Array<{ locale: string }> {
  return locales.map(locale => ({ locale }))
}
