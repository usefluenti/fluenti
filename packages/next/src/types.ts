export interface FluentiNextOptions {
  /**
   * Directory containing source translation catalogs (e.g., PO/JSON files).
   * Used for watching file changes in dev mode.
   * @default './locales'
   */
  catalogDir?: string

  /**
   * Output directory for compiled JS catalogs.
   * @default './src/locales/compiled'
   */
  compileOutDir?: string

  /**
   * Source locale code.
   * @default 'en'
   */
  sourceLocale?: string

  /**
   * List of locale codes to compile.
   * @default [sourceLocale]
   */
  locales?: string[]

  /**
   * Catalog format: 'json' or 'po'.
   * @default 'po'
   */
  format?: 'json' | 'po'

  /**
   * Enable auto-compilation of catalogs on file change in dev mode.
   * @default true
   */
  autoCompile?: boolean

  /**
   * Path to the server i18n module that calls `configureServerI18n()`.
   * When set, `t``\`\`` and `t()` in Server Components are automatically
   * transformed to use `__getServerI18n()` from `@fluenti/next/server`.
   *
   * @example './src/lib/i18n.server'
   */
  serverModule?: string
}
