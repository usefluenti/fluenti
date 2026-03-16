import type { Strategy } from '../types'

/**
 * Add a locale prefix to a path based on the routing strategy.
 */
export function localePath(
  path: string,
  locale: string,
  defaultLocale: string,
  strategy: Strategy,
): string {
  if (strategy === 'no_prefix') return path

  // prefix_except_default: default locale gets no prefix
  if (strategy === 'prefix_except_default' && locale === defaultLocale) {
    return path.startsWith('/') ? path : `/${path}`
  }

  // prefix / prefix_and_default: always add prefix
  const cleanPath = path === '/' ? '' : (path.startsWith('/') ? path : `/${path}`)
  return `/${locale}${cleanPath}`
}

/**
 * Extract the locale code from the beginning of a path.
 * Returns the locale and the path without the locale prefix.
 */
export function extractLocaleFromPath(
  path: string,
  locales: string[],
): { locale: string | null; pathWithoutLocale: string } {
  // Match /{locale} or /{locale}/...
  const match = path.match(/^\/([^/]+)(.*)$/)
  if (!match) return { locale: null, pathWithoutLocale: path }

  const segment = match[1]!
  const rest = match[2] || '/'

  if (locales.includes(segment)) {
    return {
      locale: segment,
      pathWithoutLocale: rest || '/',
    }
  }

  return { locale: null, pathWithoutLocale: path }
}

/**
 * Generate a path for switching to a different locale,
 * preserving the current route path.
 */
export function switchLocalePath(
  currentPath: string,
  newLocale: string,
  locales: string[],
  defaultLocale: string,
  strategy: Strategy,
): string {
  if (strategy === 'no_prefix') return currentPath

  // Extract current locale prefix (if any)
  const { pathWithoutLocale } = extractLocaleFromPath(currentPath, locales)

  // Build new path with the target locale
  return localePath(pathWithoutLocale, newLocale, defaultLocale, strategy)
}
