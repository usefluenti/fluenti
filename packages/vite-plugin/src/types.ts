/** Options passed to RuntimeGenerator methods */
export interface RuntimeGeneratorOptions {
  catalogDir: string
  locales: string[]
  sourceLocale: string
  defaultBuildLocale: string
}

/** Framework-specific virtual module runtime generator */
export interface RuntimeGenerator {
  /** Generate the main reactive runtime module (virtual:fluenti/runtime) */
  generateRuntime(options: RuntimeGeneratorOptions): string
  /** Generate the per-route runtime module (virtual:fluenti/route-runtime) */
  generateRouteRuntime(options: RuntimeGeneratorOptions): string
}

/** User-facing plugin options (framework packages expose this to consumers) */
export interface FluentiPluginOptions {
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
  /** Auto extract+compile before production build (default: true) */
  buildAutoCompile?: boolean
}

/** Internal options used by createFluentiPlugins (includes required framework field) */
export interface FluentiCoreOptions {
  /** Directory containing compiled message catalogs */
  catalogDir?: string | undefined
  /** Source locale */
  sourceLocale?: string | undefined
  /** Available locales */
  locales?: string[] | undefined
  /** Code splitting strategy: 'dynamic' (reactive catalog), 'static' (direct imports), false (off) */
  splitting?: 'dynamic' | 'static' | false | undefined
  /** Default locale for build-time static strategy */
  defaultBuildLocale?: string | undefined
  /** Source file patterns for auto extract in dev */
  include?: string[] | undefined
  /** Auto extract+compile in dev mode (default: true) */
  devAutoCompile?: boolean | undefined
  /** Auto extract+compile before production build (default: true) */
  buildAutoCompile?: boolean | undefined
  /** Framework identifier for scope transform and runtime key */
  framework: 'vue' | 'solid' | 'react'
}
