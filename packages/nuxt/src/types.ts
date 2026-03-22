import type { FluentiBuildConfig } from '@fluenti/core'
// Re-export core types for backwards compatibility
export type { LocaleObject, LocaleDefinition } from '@fluenti/core'
export { resolveLocaleCodes } from '@fluenti/core'

// Import core types needed locally
import type { LocaleDefinition, LocaleObject } from '@fluenti/core'

/** Routing strategy for locale-prefixed URLs */
export type Strategy = 'prefix' | 'prefix_except_default' | 'prefix_and_default' | 'no_prefix' | 'domains'

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
export type BuiltinDetector = 'path' | 'cookie' | 'header' | 'query' | 'domain'

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
  /** The request hostname (available when `strategy: 'domains'`) */
  host?: string
  /** Pre-read cookie value (hoisted before await in plugin) */
  cookieValue?: string | null
  /** Pre-read Accept-Language header (hoisted before await in plugin) */
  acceptLanguage?: string
}

/**
 * A locale detector function.
 *
 * Can be sync or async. Call `ctx.setLocale(locale)` to claim a locale.
 */
export type LocaleDetectorFn = (ctx: LocaleDetectContext) => void | Promise<void>

/**
 * Per-page locale configuration.
 *
 * Restricts which locales a page supports. Routes will only be generated
 * for the specified locales.
 *
 * @example
 * ```ts
 * // In a page component's <script setup>
 * defineI18nRoute({ locales: ['en', 'ja'] }) // only en and ja for this page
 * defineI18nRoute(false) // disable i18n for this page
 * ```
 */
export type I18nRouteConfig = { locales: string[] } | false

/** Domain-to-locale mapping for the `'domains'` strategy */
export interface DomainConfig {
  /** Domain hostname (e.g. 'example.jp', 'ja.example.com') */
  domain: string
  /** Locale code for this domain */
  locale: string
  /** Whether this is the default domain (used for x-default hreflang) */
  defaultForLocale?: boolean
}

/** @fluenti/nuxt module options (set in nuxt.config.ts under `fluenti` key) */
export interface FluentNuxtOptions {
  /** fluenti.config.ts path or inline config */
  config?: string | FluentiBuildConfig

  // ---- Core overrides (take precedence over fluenti.config.ts) ----

  /** Override locales from fluenti.config.ts */
  locales?: FluentiBuildConfig['locales']
  /** Override defaultLocale from fluenti.config.ts */
  defaultLocale?: string
  /** Override sourceLocale from fluenti.config.ts */
  sourceLocale?: string
  /** Override catalogDir from fluenti.config.ts */
  catalogDir?: string

  // ---- Nuxt-specific: routing, detection, components ----

  /** URL routing strategy */
  strategy?: Strategy
  /** Browser language detection settings */
  detectBrowserLanguage?: DetectBrowserLanguageOptions
  /**
   * Ordered list of locale detectors.
   *
   * Each entry is either a built-in detector name ('path', 'cookie', 'header', 'query', 'domain')
   * or a file path to a custom detector module (e.g. '~/detectors/jwt-detector').
   *
   * Detectors run in order; the first one to call `ctx.setLocale()` wins.
   *
   * @default ['path', 'cookie', 'header']
   */
  detectOrder?: Array<BuiltinDetector | string>
  /**
   * Query parameter name for locale detection (e.g. `?lang=ja`).
   *
   * @default 'locale'
   */
  queryParamKey?: string
  /**
   * Prefix for globally registered i18n components (Trans, Plural, Select, DateTime, NumberFormat).
   *
   * Use this to avoid naming conflicts with other libraries.
   *
   * @example 'I18n'  // → I18nTrans, I18nPlural, I18nSelect, I18nDateTime, I18nNumberFormat
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
   * Whether to auto-import composables (useLocalePath, useSwitchLocalePath, useLocaleHead, useI18n).
   *
   * Set to `false` to disable all auto-imports. Useful when migrating from `@nuxtjs/i18n`
   * or when you want explicit imports to avoid naming collisions.
   *
   * @default true
   */
  autoImports?: boolean
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
   * Route generation mode for locale variants.
   *
   * - `'all'` (default): All pages get locale route variants unless explicitly
   *   opted out via `definePageMeta({ i18n: false })`.
   * - `'opt-in'`: Only pages that explicitly declare `definePageMeta({ i18n: { locales: [...] } })`
   *   get locale route variants. Pages without an `i18n` meta field are left untouched.
   *
   * Use `'opt-in'` for large projects where only a subset of pages need i18n routing.
   *
   * @default 'all'
   */
  routeMode?: 'all' | 'opt-in'
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
  /**
   * Custom route paths per locale.
   *
   * Allows different URL slugs for different locales (e.g. `/about` in English
   * becomes `/について` in Japanese).
   *
   * Keys are the original route paths; values are locale-to-path mappings.
   *
   * @example
   * ```ts
   * routeOverrides: {
   *   '/about': { ja: '/について', 'zh-CN': '/关于' },
   *   '/contact': { ja: '/お問い合わせ' },
   * }
   * ```
   */
  routeOverrides?: Record<string, Record<string, string>>
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
   * Domain-to-locale mappings for the `'domains'` strategy.
   *
   * Each entry maps a domain hostname to a locale. Required when `strategy` is `'domains'`.
   *
   * Can also be specified inline in locale objects via `{ code: 'ja', domain: 'example.jp' }`.
   *
   * @example
   * ```ts
   * domains: [
   *   { domain: 'example.com', locale: 'en', defaultForLocale: true },
   *   { domain: 'example.jp', locale: 'ja' },
   * ]
   * ```
   */
  domains?: DomainConfig[]
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
   * Whether to inject `$localePath` onto `app.config.globalProperties`.
   *
   * Set to `false` if another plugin (e.g. `@nuxtjs/i18n`) already provides `$localePath`,
   * or when using composition API exclusively.
   *
   * @default true
   */
  injectGlobalProperties?: boolean
  /**
   * Callback fired when a translation key is missing from the catalog.
   *
   * Useful for logging, error tracking, or providing dynamic fallbacks.
   */
  onMissingTranslation?: (locale: string, id: string) => string | undefined
  /**
   * Structured error handler for i18n errors.
   */
  onError?: I18nErrorHandler
  /**
   * Generate fallback text when a translation is missing or errors.
   */
  getMessageFallback?: MessageFallbackHandler
}

/** Structured i18n error types */
export type I18nErrorCode = 'MISSING_MESSAGE' | 'MISSING_LOCALE' | 'FORMAT_ERROR' | 'LOAD_ERROR'

/** Structured error passed to the onError callback */
export interface I18nError {
  /** Error classification */
  code: I18nErrorCode
  /** Human-readable error message */
  message: string
  /** The message key that caused the error */
  key?: string
  /** The locale that caused the error */
  locale?: string
  /** The original error (if wrapping a lower-level error) */
  cause?: unknown
}

/** Callback for structured i18n error handling */
export type I18nErrorHandler = (error: I18nError) => void

/**
 * Callback to generate fallback text when a translation is missing or errors.
 *
 * Return a string to use as the fallback, or `undefined` for default behavior
 * (which shows the message key).
 */
export type MessageFallbackHandler = (error: I18nError) => string | undefined

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
  /** Domain-to-locale mappings (when strategy is 'domains') */
  domains?: DomainConfig[]
  /** Locale metadata (iso tags, dir, names) — keyed by locale code */
  localeProperties?: Record<string, LocaleObject>
}

// ---- Utility helpers ----

/** Build a locale properties map from LocaleDefinition[] */
export function resolveLocaleProperties(locales: LocaleDefinition[]): Record<string, LocaleObject> {
  const map: Record<string, LocaleObject> = {}
  for (const l of locales) {
    if (typeof l === 'string') {
      map[l] = { code: l }
    } else {
      map[l.code] = l
    }
  }
  return map
}

/** Build domain configs from locale objects that have a `domain` field */
export function resolveDomainConfigs(
  locales: LocaleDefinition[],
  explicit?: DomainConfig[],
): DomainConfig[] {
  if (explicit?.length) return explicit
  const configs: DomainConfig[] = []
  for (const l of locales) {
    if (typeof l !== 'string' && l.domain) {
      configs.push({ domain: l.domain, locale: l.code })
    }
  }
  return configs
}
