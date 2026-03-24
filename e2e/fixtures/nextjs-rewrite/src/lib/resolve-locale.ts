import { headers } from 'next/headers'

/**
 * Reads the locale resolved by createI18nMiddleware via the x-fluenti-locale header.
 */
export default async function resolveLocale(): Promise<string> {
  const headerStore = await headers()
  return headerStore.get('x-fluenti-locale') ?? 'en'
}
