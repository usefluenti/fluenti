import type { DateFormatOptions, NumberFormatOptions, Locale } from '@fluenti/core'

/**
 * Configuration for `withFluenti()`.
 *
 * Reads defaults from `fluenti.config.ts` in the project root.
 * All options here override the config file values.
 */
export interface WithFluentConfig {
  /** Override `fluenti.config.ts` locales */
  locales?: string[]
  /** Override `fluenti.config.ts` sourceLocale (used as defaultLocale) */
  defaultLocale?: string
  /** Override `fluenti.config.ts` compileOutDir */
  compiledDir?: string

  /** Custom serverModule path (skip auto-generation) */
  serverModule?: string
  /** Where to generate the serverModule (default: node_modules/.fluenti) */
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

  /** Custom date format styles */
  dateFormats?: DateFormatOptions
  /** Custom number format styles */
  numberFormats?: NumberFormatOptions
  /** Fallback chain per locale */
  fallbackChain?: Record<string, Locale[]>
  /** Auto extract+compile in dev mode (default: true) */
  devAutoCompile?: boolean
  /** Debounce delay in ms for dev auto-compile (default: 1000). Increase if you see excessive recompilation. */
  devAutoCompileDelay?: number
  /** Auto extract+compile before production build (default: true) */
  buildAutoCompile?: boolean
}

/**
 * Resolved config after merging fluenti.config.ts + withFluenti() overrides.
 */
export interface ResolvedFluentConfig {
  locales: string[]
  defaultLocale: string
  compiledDir: string
  serverModule: string | null
  serverModuleOutDir: string
  resolveLocale?: string
  cookieName: string
  dateFormats?: DateFormatOptions
  numberFormats?: NumberFormatOptions
  fallbackChain?: Record<string, Locale[]>
}

/**
 * Props for the I18nProvider server component.
 */
export interface I18nProviderProps {
  /** Active locale. If omitted, uses defaultLocale from config. */
  locale?: string
  children: React.ReactNode
}
