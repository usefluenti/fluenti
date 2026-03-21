import type { Plugin } from 'vite'

/**
 * Vite plugin that transforms `definePageMeta({ i18n: ... })` into
 * the internal `i18nRoute` format used by the page extension system.
 *
 * This allows users to use native Nuxt `definePageMeta` with an `i18n` key
 * instead of the separate `defineI18nRoute()` macro.
 *
 * Supports:
 * - `definePageMeta({ i18n: { locales: ['en', 'ja'] } })`
 * - `definePageMeta({ i18n: false })`
 *
 * The transform also rewrites `defineI18nRoute(...)` to
 * `definePageMeta({ i18nRoute: ... })` for backwards compatibility.
 */
export function createPageMetaTransform(): Plugin {
  return {
    name: 'fluenti:page-meta-transform',
    enforce: 'pre',

    transform(code, id) {
      // Only transform Vue SFC script blocks and TS/JS files in pages/
      if (!id.includes('/pages/') && !id.includes('\\pages\\')) return null
      if (!code.includes('defineI18nRoute') && !code.includes('i18n')) return null

      let transformed = code

      // Transform: defineI18nRoute({ locales: [...] })
      //        →  definePageMeta({ i18nRoute: { locales: [...] } })
      // Transform: defineI18nRoute(false)
      //        →  definePageMeta({ i18nRoute: false })
      const defineI18nRouteRegex = /defineI18nRoute\s*\(([^)]+)\)/g
      if (defineI18nRouteRegex.test(transformed)) {
        transformed = transformed.replace(
          /defineI18nRoute\s*\(([^)]+)\)/g,
          (_match, arg: string) => `definePageMeta({ i18nRoute: ${arg.trim()} })`,
        )
      }

      // Support native: definePageMeta({ i18n: { locales: [...] } })
      // Rewrite `i18n:` key to `i18nRoute:` so page-extend can read it
      if (transformed.includes('definePageMeta') && transformed.includes('i18n:')) {
        // Simple regex for { i18n: ... } within definePageMeta
        // This handles the common case; complex nested objects may need
        // AST-based transformation in the future.
        transformed = transformed.replace(
          /(definePageMeta\s*\(\s*\{[^}]*)\bi18n\s*:/g,
          '$1i18nRoute:',
        )
      }

      if (transformed === code) return null

      return {
        code: transformed,
        map: null,
      }
    },
  }
}
