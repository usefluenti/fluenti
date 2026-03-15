/** Routing strategy for locale-prefixed URLs */
export type Strategy = 'prefix' | 'prefix_except_default' | 'prefix_and_default' | 'no_prefix'

/** Browser language detection options */
export interface DetectBrowserLanguageOptions {
  /** Use a cookie to persist the detected locale */
  useCookie?: boolean
  /** Cookie key name (default: 'fluenti_locale') */
  cookieKey?: string
  /** Fallback locale when detection fails */
  fallbackLocale?: string
}

/** Built-in detector names */
export type BuiltinDetector = 'path' | 'cookie' | 'header' | 'query'

/**
 * Context passed to locale detectors and the `fluenti:detect-locale` hook.
 *
 * Detectors inspect the context and call `setLocale()` to claim a locale.
 * Once a locale is set, subsequent detectors are skipped.
 */
export interface LocaleDetectContext {
  /** The request path (e.g. '/ja/about') */
  path: string
  /** Available locale codes */
  locales: string[]
  /** Default locale */
  defaultLocale: string
  /** Routing strategy */
  strategy: Strategy
  /** detectBrowserLanguage config */
  detectBrowserLanguage?: DetectBrowserLanguageOptions
  /** The detected locale so far (null if not yet detected) */
  detectedLocale: string | null
  /** Set the locale and stop the detection chain */
  setLocale: (locale: string) => void
  /** Whether we are running on the server */
  isServer: boolean
}

/**
 * A locale detector function.
 *
 * Can be sync or async. Call `ctx.setLocale(locale)` to claim a locale.
 */
export type LocaleDetectorFn = (ctx: LocaleDetectContext) => void | Promise<void>

/** @fluenti/nuxt module options (set in nuxt.config.ts under `fluenti` key) */
export interface FluentNuxtOptions {
  /** List of supported locale codes */
  locales: string[]
  /** Default locale code */
  defaultLocale: string
  /** URL routing strategy */
  strategy?: Strategy
  /** Source locale for message extraction */
  sourceLocale?: string
  /** Directory for compiled message catalogs */
  catalogDir?: string
  /** Browser language detection settings */
  detectBrowserLanguage?: DetectBrowserLanguageOptions
  /**
   * Ordered list of locale detectors.
   *
   * Each entry is either a built-in detector name ('path', 'cookie', 'header', 'query')
   * or a file path to a custom detector module (e.g. '~/detectors/jwt-detector').
   *
   * Detectors run in order; the first one to call `ctx.setLocale()` wins.
   *
   * @default ['path', 'cookie', 'header']
   */
  detectOrder?: Array<BuiltinDetector | string>
  /** Enable @fluenti/vue-i18n-compat bridge mode */
  compat?: boolean
}

/** Runtime config injected into Nuxt's public runtimeConfig */
export interface FluentNuxtRuntimeConfig {
  locales: string[]
  defaultLocale: string
  strategy: Strategy
  detectBrowserLanguage?: DetectBrowserLanguageOptions
  /** Ordered list of detector names/paths */
  detectOrder: Array<string>
}
