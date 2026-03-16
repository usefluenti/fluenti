/**
 * @fluenti/next/server — Server-side i18n for Next.js App Router.
 *
 * Wraps `createServerI18n` from `@fluenti/react/server` with:
 * - Async `setLocale()` that pre-loads messages (enables sync access later)
 * - `__getServerI18n()` singleton for the loader transform
 *
 * @example
 * ```ts
 * // src/lib/i18n.server.ts
 * import { configureServerI18n } from '@fluenti/next/server'
 *
 * export const { setLocale, getI18n, Trans, Plural } = configureServerI18n({
 *   loadMessages: (locale) => import(`@/locales/compiled/${locale}`),
 *   fallbackLocale: 'en',
 * })
 * ```
 */

import { createServerI18n } from '@fluenti/react/server'
import type { ServerI18nConfig, ServerI18n } from '@fluenti/react/server'
import type { FluentInstanceExtended } from '@fluenti/core'

export type { ServerI18nConfig } from '@fluenti/react/server'

// Module-level singleton — set by configureServerI18n()
let _getI18nSync: (() => FluentInstanceExtended & { locale: string }) | null = null

/**
 * The object returned by `configureServerI18n`.
 *
 * Same as `ServerI18n` from `@fluenti/react/server`, but `setLocale` is
 * async — it eagerly loads messages so that subsequent `t()` calls
 * (injected by the loader) can resolve synchronously.
 */
export interface NextServerI18n extends Omit<ServerI18n, 'setLocale'> {
  /**
   * Set the locale and pre-load messages for the current request.
   * Call this once in your root layout. Must be awaited.
   *
   * @example
   * ```tsx
   * // src/app/layout.tsx
   * import { setLocale } from '@/lib/i18n.server'
   *
   * export default async function RootLayout({ children }) {
   *   const locale = (await cookies()).get('locale')?.value ?? 'en'
   *   await setLocale(locale)
   *   return <html lang={locale}><body>{children}</body></html>
   * }
   * ```
   */
  setLocale: (locale: string) => Promise<void>
}

/**
 * Configure server-side i18n for Next.js.
 *
 * This is a wrapper around `createServerI18n` that:
 * 1. Makes `setLocale()` async — it pre-loads messages into the per-request cache
 * 2. Registers a module-level singleton so the loader's `__getServerI18n()` works
 *
 * @example
 * ```ts
 * import { configureServerI18n } from '@fluenti/next/server'
 *
 * export const { setLocale, getI18n, Trans, Plural, DateTime, NumberFormat } =
 *   configureServerI18n({
 *     loadMessages: (locale) => import(`@/locales/compiled/${locale}`),
 *     fallbackLocale: 'en',
 *   })
 * ```
 */
export function configureServerI18n(config: ServerI18nConfig): NextServerI18n {
  const serverI18n = createServerI18n(config)
  _getI18nSync = serverI18n.getI18nSync

  const origSetLocale = serverI18n.setLocale

  async function setLocale(locale: string): Promise<void> {
    origSetLocale(locale)
    // Eagerly load messages so __getServerI18n() can return synchronously
    await serverI18n.getI18n()
  }

  return {
    ...serverI18n,
    setLocale,
  }
}

/**
 * Synchronous accessor for the current request's i18n instance.
 *
 * @internal Used by the `@fluenti/next` loader transform.
 * Not part of the public API.
 *
 * Requires:
 * 1. `configureServerI18n()` has been called (module loaded)
 * 2. `await setLocale(locale)` has been called in the current request's layout
 */
export function __getServerI18n(): FluentInstanceExtended & { locale: string } {
  if (!_getI18nSync) {
    throw new Error(
      '[fluenti] Server i18n not configured. ' +
        'Ensure your server i18n module calls configureServerI18n() from @fluenti/next/server, ' +
        'and that it is imported before any Server Component renders.',
    )
  }
  return _getI18nSync()
}
