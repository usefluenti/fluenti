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

/** Page route definition used for route extension */
export interface PageRoute {
  path: string
  name?: string
  children?: PageRoute[]
}

/**
 * Extend page routes with locale-prefixed variants.
 * Mutates the pages array in place (Nuxt convention).
 */
export function extendPages(
  pages: PageRoute[],
  options: { locales: string[]; defaultLocale: string; strategy: Strategy },
): void {
  const { locales, defaultLocale, strategy } = options
  if (strategy === 'no_prefix') return

  const originalPages = [...pages]

  for (const locale of locales) {
    // For prefix_except_default, skip creating prefixed routes for the default locale
    if (strategy === 'prefix_except_default' && locale === defaultLocale) continue

    for (const page of originalPages) {
      const prefixedPage = prefixPage(page, locale)
      pages.push(prefixedPage)
    }
  }

  // For prefix strategy, remove the original unprefixed routes
  // (every locale including default must have a prefix)
  if (strategy === 'prefix') {
    // Remove all original pages (they'll only exist as prefixed versions)
    pages.splice(0, originalPages.length)
  }
}

function prefixPage(page: PageRoute, locale: string): PageRoute {
  const prefixed: PageRoute = {
    ...page,
    path: `/${locale}${page.path === '/' ? '' : page.path}`,
  }
  if (page.name) {
    prefixed.name = `${page.name}___${locale}`
  }

  if (page.children) {
    prefixed.children = page.children.map((child) => {
      const prefixedChild: PageRoute = { ...child }
      if (child.name) {
        prefixedChild.name = `${child.name}___${locale}`
      }
      return prefixedChild
    })
  }

  return prefixed
}
