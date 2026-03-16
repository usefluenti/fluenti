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
}
