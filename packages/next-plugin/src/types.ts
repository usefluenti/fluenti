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
   * Resolve locale in contexts where FluentProvider doesn't run
   * (e.g. Server Actions).
   *
   * FluentProvider's locale is passed via prop — not configured here.
   */
  resolveLocale?: () => string | Promise<string>

  /** Custom date format styles */
  dateFormats?: DateFormatOptions
  /** Custom number format styles */
  numberFormats?: NumberFormatOptions
  /** Fallback chain per locale */
  fallbackChain?: Record<string, Locale[]>
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
  resolveLocale?: () => string | Promise<string>
  dateFormats?: DateFormatOptions
  numberFormats?: NumberFormatOptions
  fallbackChain?: Record<string, Locale[]>
}

/**
 * Props for the FluentProvider server component.
 */
export interface FluentProviderProps {
  /** Active locale. If omitted, uses defaultLocale from config. */
  locale?: string
  children: React.ReactNode
}
