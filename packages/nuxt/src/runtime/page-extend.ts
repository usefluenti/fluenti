import type { Strategy } from '../types'

/** Page route definition used for route extension */
export interface PageRoute {
  path: string
  name?: string
  children?: PageRoute[]
}

/**
 * Extend page routes with locale-prefixed variants.
 * Mutates the pages array in place (Nuxt convention).
 *
 * This is a build-time utility used in the module's `pages:extend` hook.
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
