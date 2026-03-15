export interface FluentiPluginOptions {
  /** Path to fluenti config file */
  configPath?: string
  /** Framework mode: 'vue' | 'solid' | 'auto' */
  framework?: 'vue' | 'solid' | 'auto'
  /** Directory containing compiled message catalogs */
  catalogDir?: string
  /** Source locale */
  sourceLocale?: string
  /** Available locales */
  locales?: string[]
  /** Code splitting strategy: 'dynamic' (reactive catalog), 'static' (direct imports), 'per-route' (automatic route-level splitting), false (off) */
  splitting?: 'dynamic' | 'static' | 'per-route' | false
  /** Default locale for build-time static strategy */
  defaultBuildLocale?: string
}
