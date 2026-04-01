import type { FluentiBuildConfig } from '@fluenti/core/compiler'

/**
 * Configuration for `withFluenti()`.
 *
 * All i18n config (locales, sourceLocale, splitting, etc.) lives in `fluenti.config.ts`.
 * Only Next.js-specific options are set here.
 */
export interface WithFluentConfig {
  /** fluenti.config.ts path or inline config */
  config?: string | FluentiBuildConfig
  /**
   * Shorthand for `config: { locales }`. Specify target locales without a separate config file.
   * Ignored if `config` is also provided.
   *
   * @example
   * ```ts
   * export default withFluenti({ locales: ['en', 'ja', 'zh-CN'] })({ reactStrictMode: true })
   * ```
   */
  locales?: string[]

  // ---- Next.js-specific ----

  /** Custom serverModule path (skip auto-generation) */
  serverModule?: string
  /** Where to generate the serverModule (default: .fluenti) */
  serverModuleOutDir?: string

  /**
   * Path to a module that default-exports an async function returning the locale string.
   * Used in contexts where I18nProvider doesn't run (e.g. Server Actions).
   *
   * The module must `export default` a function `() => string | Promise<string>`.
   *
   * If omitted, defaults to reading the `locale` cookie.
   *
   * @example './lib/resolve-locale'
   */
  resolveLocale?: string

  /** Cookie name used for locale detection (default: 'locale') */
  cookieName?: string

  /**
   * Include full runtime ICU interpolation in the generated Next server/client modules.
   *
   * Enabled by default because Next apps can mix compiled catalogs with runtime
   * `<Plural>` / `<Select>` / server component paths that still need ICU fallback.
   * Set to `false` only when your app is fully compile-only and you want to trim
   * parser/runtime ICU code from the generated modules.
   */
  runtimeInterpolate?: boolean

  /**
   * Webpack loader enforce mode (default: 'pre').
   *
   * Set to `undefined` to let webpack determine ordering, or `'post'` to run after other loaders.
   * This can be useful when other loaders need to process files before Fluenti's transform.
   */
  loaderEnforce?: 'pre' | 'post' | undefined
}

/**
 * Resolved config after merging fluenti.config.ts + withFluenti() overrides.
 */
export interface ResolvedFluentConfig {
  /** The fully resolved FluentiBuildConfig */
  fluentiConfig: FluentiBuildConfig
  serverModule: string | null
  serverModuleOutDir: string
  resolveLocale?: string
  cookieName: string
  runtimeInterpolate: boolean
}

/**
 * Props for the I18nProvider server component.
 */
export interface I18nProviderProps {
  /** Active locale. If omitted, uses defaultLocale from config. */
  locale?: string
  children: React.ReactNode
}
