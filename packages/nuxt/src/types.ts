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

/** Custom message ID generator function (re-exported from @fluenti/vite-plugin) */
export type IdGenerator = (message: string, context?: string) => string

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
  /**
   * Code splitting strategy for compiled catalogs.
   * - `'dynamic'`: reactive catalog loaded per-route
   * - `'static'`: direct imports at build time
   * - `false`: no splitting
   */
  splitting?: 'dynamic' | 'static' | false
  /** Default locale for build-time static splitting strategy */
  defaultBuildLocale?: string
  /** Source file patterns for auto extract in dev (e.g. `['src/**\/*.vue']`) */
  include?: string[]
  /** Auto extract+compile in dev mode @default true */
  devAutoCompile?: boolean
  /** Auto extract+compile before production build @default true */
  buildAutoCompile?: boolean
  /** File extension for compiled catalog files @default '.js' */
  catalogExtension?: string
  /** Custom message ID generator */
  idGenerator?: IdGenerator
  /** Called before auto-compile runs (dev and build). Return false to skip compilation. */
  onBeforeCompile?: () => boolean | void | Promise<boolean | void>
  /** Called after auto-compile completes successfully */
  onAfterCompile?: () => void | Promise<void>
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
  /**
   * Prefix for globally registered i18n components (Trans, Plural, Select).
   *
   * Use this to avoid naming conflicts with other libraries.
   *
   * @example 'I18n'  // → I18nTrans, I18nPlural, I18nSelect
   * @default '' (no prefix)
   */
  componentPrefix?: string
  /**
   * Automatically register `@fluenti/vite-plugin` in the Vite config.
   *
   * Set to `false` to disable if you configure the Vite plugin manually.
   *
   * @default true
   */
  autoVitePlugin?: boolean
  /**
   * Incremental Static Regeneration (ISR) settings.
   *
   * When enabled, the module automatically generates `routeRules` with
   * ISR caching for all locale route patterns.
   */
  isr?: ISROptions
  /** Enable @fluenti/vue-i18n-compat bridge mode */
  compat?: boolean
  /**
   * Whether to auto-import composables (useLocalePath, useSwitchLocalePath, useLocaleHead, useI18n).
   *
   * Set to `false` to disable all auto-imports. Useful when migrating from `@nuxtjs/i18n`
   * or when you want explicit imports to avoid naming collisions.
   *
   * @default true
   */
  autoImports?: boolean
  /**
   * Query parameter name for locale detection (e.g. `?lang=ja`).
   *
   * @default 'locale'
   */
  queryParamKey?: string
  /**
   * Whether to inject `$localePath` onto `app.config.globalProperties`.
   *
   * Set to `false` if another plugin (e.g. `@nuxtjs/i18n`) already provides `$localePath`,
   * or when using composition API exclusively.
   *
   * @default true
   */
  injectGlobalProperties?: boolean
  /**
   * Whether the locale redirect middleware should be registered globally.
   *
   * Set to `false` to register it as a named middleware instead, so you can
   * apply it only to specific pages via `definePageMeta({ middleware: ['fluenti-locale-redirect'] })`.
   *
   * Only relevant when `strategy` is `'prefix'`.
   *
   * @default true
   */
  globalMiddleware?: boolean
  /**
   * Whether to register the `NuxtLinkLocale` component globally.
   *
   * Set to `false` to disable registration. You can still import it manually
   * from `@fluenti/nuxt/runtime/components/NuxtLinkLocale`.
   *
   * @default true
   */
  registerNuxtLinkLocale?: boolean
  /**
   * Whether to extend routes with locale-prefixed variants.
   *
   * Set to `false` to handle locale routing yourself (e.g., via a custom
   * `pages:extend` hook or Nuxt Layers). When `false`, the module will NOT
   * create locale-suffixed route clones and will NOT remove unprefixed routes.
   *
   * @default true
   */
  extendRoutes?: boolean
  /**
   * Template for generating locale-specific route names.
   *
   * Receives the original route name and locale code, returns the desired name.
   * Only used when `extendRoutes` is not `false`.
   *
   * @default (name, locale) => `${name}___${locale}`
   * @example (name, locale) => `${locale}:${name}`
   */
  routeNameTemplate?: (name: string, locale: string) => string
}

/** ISR configuration */
export interface ISROptions {
  /** Enable ISR route rules generation */
  enabled: boolean
  /** Cache TTL in seconds (default: 3600 — 1 hour) */
  ttl?: number
}

/** Runtime config injected into Nuxt's public runtimeConfig */
export interface FluentNuxtRuntimeConfig {
  locales: string[]
  defaultLocale: string
  strategy: Strategy
  detectBrowserLanguage?: DetectBrowserLanguageOptions
  /** Ordered list of detector names/paths */
  detectOrder: Array<string>
  /** Query parameter name for locale detection */
  queryParamKey: string
  /** Whether to inject $localePath onto globalProperties */
  injectGlobalProperties: boolean
}
