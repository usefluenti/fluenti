import type { Strategy } from '../types'

/** Page route definition used for route extension */
export interface PageRoute {
  path: string
  name?: string
  children?: PageRoute[]
  meta?: Record<string, unknown>
}

/** Route name template: (originalName, locale) => newName */
export type RouteNameTemplate = (name: string, locale: string) => string

const DEFAULT_ROUTE_NAME_TEMPLATE: RouteNameTemplate = (name, locale) =>
  `${name}___${locale}`

export interface ExtendPagesOptions {
  locales: string[]
  defaultLocale: string
  strategy: Strategy
  routeNameTemplate?: RouteNameTemplate
  /**
   * Custom route paths per locale.
   * Keys are original route paths; values map locale → custom path.
   */
  routeOverrides?: Record<string, Record<string, string>>
  /**
   * Route generation mode.
   * - `'all'` (default): All pages get locale variants unless opted out via `i18nRoute: false`.
   * - `'opt-in'`: Only pages with explicit `i18nRoute` meta get locale variants.
   */
  routeMode?: 'all' | 'opt-in'
}

/**
 * Extend page routes with locale-prefixed variants.
 * Mutates the pages array in place (Nuxt convention).
 *
 * This is a build-time utility used in the module's `pages:extend` hook.
 */
export function extendPages(
  pages: PageRoute[],
  options: ExtendPagesOptions,
): void {
  const { locales, defaultLocale, strategy, routeOverrides } = options
  const routeMode = options.routeMode ?? 'all'
  if (strategy === 'no_prefix' || strategy === 'domains') return

  const nameTemplate = options.routeNameTemplate ?? DEFAULT_ROUTE_NAME_TEMPLATE
  const originalPages = [...pages]

  // Filter out pages that have i18nRoute === false in their meta
  const isPageEnabled = (page: PageRoute, locale: string): boolean => {
    const i18nRoute = page.meta?.['i18nRoute'] as { locales?: string[] } | false | undefined

    // opt-in mode: pages without any i18nRoute meta are not extended
    if (routeMode === 'opt-in' && i18nRoute === undefined) return false

    if (i18nRoute === false) return false
    if (i18nRoute && i18nRoute.locales) {
      return i18nRoute.locales.includes(locale)
    }
    return true
  }

  for (const locale of locales) {
    // For prefix_except_default, skip creating prefixed routes for the default locale
    if (strategy === 'prefix_except_default' && locale === defaultLocale) continue

    for (const page of originalPages) {
      if (!isPageEnabled(page, locale)) continue
      const prefixedPage = prefixPage(page, locale, nameTemplate, routeOverrides)
      pages.push(prefixedPage)
    }
  }

  // For prefix strategy, remove the original unprefixed routes
  // (every locale including default must have a prefix)
  if (strategy === 'prefix') {
    // Remove all original pages (they'll only exist as prefixed versions)
    pages.splice(0, originalPages.length)
  }

  // For prefix_except_default, filter out pages disabled for the default locale
  if (strategy === 'prefix_except_default') {
    for (let i = pages.length - 1; i >= 0; i--) {
      const page = pages[i]!
      // Only check original (unprefixed) pages
      if (originalPages.includes(page) && !isPageEnabled(page, defaultLocale)) {
        pages.splice(i, 1)
      }
    }
  }
}

function prefixPage(
  page: PageRoute,
  locale: string,
  nameTemplate: RouteNameTemplate,
  routeOverrides?: Record<string, Record<string, string>>,
): PageRoute {
  // Check if there's a custom path for this locale
  const overridePath = routeOverrides?.[page.path]?.[locale]
  const basePath = overridePath ?? page.path

  const prefixed: PageRoute = {
    ...page,
    path: `/${locale}${basePath === '/' ? '' : basePath}`,
  }
  if (page.name) {
    prefixed.name = nameTemplate(page.name, locale)
  }

  if (page.children) {
    prefixed.children = page.children.map((child) => {
      const childOverride = routeOverrides?.[child.path]?.[locale]
      const prefixedChild: PageRoute = {
        ...child,
        ...(childOverride ? { path: childOverride } : {}),
      }
      if (child.name) {
        prefixedChild.name = nameTemplate(child.name, locale)
      }
      return prefixedChild
    })
  }

  return prefixed
}
