/**
 * @module @fluenti/next/navigation
 *
 * Type-safe navigation factory for Next.js i18n routing.
 *
 * @example
 * ```tsx
 * // src/lib/navigation.ts
 * import { createNavigation } from '@fluenti/next/navigation'
 *
 * export const { Link, useRouter, redirect, usePathname, getPathname } = createNavigation({
 *   locales: ['en', 'fr', 'ja'] as const,
 *   sourceLocale: 'en',
 *   localePrefix: 'as-needed',
 *   pathnames: {
 *     '/': { fr: '/', ja: '/' },
 *     '/about': { fr: '/a-propos', ja: '/about' },
 *     '/blog/[slug]': { fr: '/articles/[slug]', ja: '/blog/[slug]' },
 *   },
 * })
 * ```
 */
'use client'

import { createElement, forwardRef } from 'react'
import type { ReactNode } from 'react'
import { resolveLocalizedPath } from './routing'
import type { RoutingConfig } from './routing'

export type { RoutingConfig }

interface NavigationLinkProps<P extends string = string, L extends string = string> {
  href: P | (string & Record<never, never>)
  locale?: L
  children?: ReactNode
  [key: string]: unknown
}

interface TypedRouter<P extends string = string, L extends string = string> {
  push(href: P | (string & Record<never, never>), options?: { locale?: L }): void
  replace(href: P | (string & Record<never, never>), options?: { locale?: L }): void
  back(): void
  forward(): void
  refresh(): void
  prefetch(href: string): void
}

// ── Factory ───────────────────────────────────────────────────────────────

export function createNavigation<
  const L extends string,
  const P extends string,
>(routing: RoutingConfig<L, P>) {
  const { locales, sourceLocale, localePrefix = 'as-needed', pathnames } = routing

  function resolvePath(href: string, locale: string): string {
    // Apply pathnames mapping if configured (supports [param] and [...slug])
    let resolved = href
    if (pathnames) {
      const mapped = resolveLocalizedPath(href, locale, pathnames as Record<string, Record<string, string>>)
      if (mapped) resolved = mapped
    }

    // Apply locale prefix
    if (localePrefix === 'never') return resolved
    if (localePrefix === 'as-needed' && locale === sourceLocale) return resolved
    return `/${locale}${resolved}`
  }

  function stripPrefix(pathname: string): string {
    if (localePrefix === 'never') return pathname
    const segments = pathname.split('/')
    const first = segments[1] ?? ''
    const lower = first.toLowerCase()
    const isLocale = locales.some(l => l.toLowerCase() === lower)
    if (isLocale) return '/' + segments.slice(2).join('/') || '/'
    return pathname
  }

  // ── Link component ────────────────────────────────────────────────────

  const Link = forwardRef<HTMLAnchorElement, NavigationLinkProps<P, L>>(
    function I18nLink({ href, locale: localeProp, ...rest }, ref) {
      // Dynamic imports to avoid SSR issues — these are resolved at runtime
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const NextLink = require('next/link').default
      let currentLocale = sourceLocale
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useI18n } = require('@fluenti/react')
        const i18n = useI18n()
        currentLocale = i18n.locale
      } catch {
        // Outside I18nProvider, use sourceLocale
      }
      const locale = localeProp ?? currentLocale
      const resolvedHref = resolvePath(String(href), String(locale))
      return createElement(NextLink, { ref, href: resolvedHref, ...rest })
    },
  )
  Link.displayName = 'I18nLink'

  // ── useRouter hook ────────────────────────────────────────────────────

  function useRouter(): TypedRouter<P, L> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useRouter: useNextRouter } = require('next/navigation')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useI18n } = require('@fluenti/react')

    const nextRouter = useNextRouter()
    const { locale } = useI18n()

    return {
      push(href: P | string, options?: { locale?: L }) {
        nextRouter.push(resolvePath(String(href), String(options?.locale ?? locale)))
      },
      replace(href: P | string, options?: { locale?: L }) {
        nextRouter.replace(resolvePath(String(href), String(options?.locale ?? locale)))
      },
      back: () => nextRouter.back(),
      forward: () => nextRouter.forward(),
      refresh: () => nextRouter.refresh(),
      prefetch: (href: string) => nextRouter.prefetch(href),
    }
  }

  // ── redirect function (server-side) ───────────────────────────────────

  function redirect(href: P | (string & Record<never, never>), locale?: L): never {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { redirect: nextRedirect } = require('next/navigation') as { redirect: (url: string) => never }
    const resolvedLocale = locale ?? sourceLocale
    return nextRedirect(resolvePath(String(href), String(resolvedLocale)))
  }

  // ── usePathname hook ──────────────────────────────────────────────────

  function usePathname(): string {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { usePathname: useNextPathname } = require('next/navigation')
    const pathname = useNextPathname()
    return stripPrefix(pathname)
  }

  // ── getPathname utility ───────────────────────────────────────────────

  function getPathname(href: P | (string & Record<never, never>), locale: L): string {
    return resolvePath(String(href), String(locale))
  }

  return { Link, useRouter, redirect, usePathname, getPathname }
}
