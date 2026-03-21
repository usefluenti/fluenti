import type { I18nRouteConfig } from '../types'

/**
 * Define per-page i18n route configuration.
 *
 * Use in `<script setup>` to restrict which locales a page supports,
 * or set to `false` to disable i18n routing for a page.
 *
 * Under the hood, this stores the config in `definePageMeta` via `meta.i18nRoute`.
 *
 * @example
 * ```vue
 * <script setup>
 * // Only generate /en/pricing and /ja/pricing routes
 * defineI18nRoute({ locales: ['en', 'ja'] })
 * </script>
 * ```
 *
 * @example
 * ```vue
 * <script setup>
 * // Skip i18n routing for this page entirely
 * defineI18nRoute(false)
 * </script>
 * ```
 */
export function defineI18nRoute(config: I18nRouteConfig): void {
  // This is a compile-time macro. At runtime, the config is read from
  // page meta during route extension. This function exists only for type
  // checking and IDE support. The actual page meta injection is handled
  // by a Vite transform or by the user calling definePageMeta manually.
  //
  // Usage: definePageMeta({ i18nRoute: defineI18nRoute({ locales: ['en', 'ja'] }) })
  // Or the module can provide a Vite plugin to auto-transform this.
  void config
}
