/**
 * @module @fluenti/next/i18n-config
 *
 * Provides i18n config values (locales, sourceLocale, cookieName) for use in middleware.
 *
 * At build time, `withFluenti()` generates `.fluenti/i18n-config.js` with the actual
 * values from `fluenti.config.ts` and sets up a resolve alias so this module is
 * replaced by the generated version.
 *
 * If `withFluenti()` is not configured (e.g. unit tests), these fallback defaults are used.
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { NextResponse } from 'next/server'
 * import { createI18nMiddleware } from '@fluenti/next/middleware'
 * import { locales, sourceLocale } from '@fluenti/next/i18n-config'
 *
 * export default createI18nMiddleware({
 *   NextResponse,
 *   locales,
 *   sourceLocale,
 *   rewriteDefaultLocale: true,
 * })
 * ```
 */

/** Available locales — overridden at build time from fluenti.config.ts */
export const locales: string[] = ['en']

/** Source/default locale — overridden at build time from fluenti.config.ts */
export const sourceLocale: string = 'en'

/** Cookie name for locale detection — overridden at build time from fluenti.config.ts */
export const cookieName: string = 'locale'
