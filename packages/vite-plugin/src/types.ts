export interface FluentiPluginOptions {
  /** Framework mode: 'vue' | 'solid' | 'react' | 'auto' */
  framework?: 'vue' | 'solid' | 'react' | 'auto'
  /** Directory containing compiled message catalogs */
  catalogDir?: string
  /** Source locale */
  sourceLocale?: string
  /** Available locales */
  locales?: string[]
  /** Code splitting strategy: 'dynamic' (reactive catalog), 'static' (direct imports), false (off) */
  splitting?: 'dynamic' | 'static' | false
  /** Default locale for build-time static strategy */
  defaultBuildLocale?: string
  /** Source file patterns for auto extract in dev */
  include?: string[]
  /** Auto extract+compile in dev mode (default: true) */
  devAutoCompile?: boolean
}
