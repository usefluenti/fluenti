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
  /** Enable @fluenti/vue-i18n-compat bridge mode */
  compat?: boolean
}

/** Runtime config injected into Nuxt's public runtimeConfig */
export interface FluentNuxtRuntimeConfig {
  locales: string[]
  defaultLocale: string
  strategy: Strategy
  detectBrowserLanguage?: DetectBrowserLanguageOptions
}
