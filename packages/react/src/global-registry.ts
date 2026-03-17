import type { FluentInstanceExtended } from '@fluenti/core'

/**
 * Global i18n instance registry.
 *
 * Used by `@fluenti/next` webpack loader and `@fluenti/vite-plugin` to access
 * the i18n instance from module-level code via a Proxy. The instance is set by
 * `<I18nProvider>` on mount.
 */

declare global {
  // eslint-disable-next-line no-var
  var __fluenti_i18n: FluentInstanceExtended | undefined
}

/** Get the global i18n instance (set by `<I18nProvider>`). */
export function getGlobalI18n(): FluentInstanceExtended | undefined {
  return globalThis.__fluenti_i18n
}

/** Set the global i18n instance. Called by `<I18nProvider>` on mount. */
export function setGlobalI18n(instance: FluentInstanceExtended): void {
  globalThis.__fluenti_i18n = instance
}

/** Clear the global i18n instance. Primarily for testing. */
export function clearGlobalI18n(): void {
  globalThis.__fluenti_i18n = undefined
}
