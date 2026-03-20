/** Options passed to RuntimeGenerator methods */
export interface RuntimeGeneratorOptions {
  catalogDir: string
  catalogExtension: string
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

/** Custom message ID generator function */
export type IdGenerator = (message: string, context?: string) => string

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
  /** File extension for compiled catalog files (default: '.js') */
  catalogExtension?: string
  /**
   * Custom message ID generator. Receives the message string and optional context,
   * returns a deterministic ID. Defaults to SHA256-based hash from @fluenti/core.
   */
  idGenerator?: IdGenerator
  /** Called before auto-compile runs (dev and build). Return false to skip compilation. */
  onBeforeCompile?: () => boolean | void | Promise<boolean | void>
  /** Called after auto-compile completes successfully */
  onAfterCompile?: () => void | Promise<void>
}

/** Internal options used by createFluentiPlugins (includes required framework field) */
export interface FluentiCoreOptions extends FluentiPluginOptions {
  /** Framework identifier for scope transform and runtime key (e.g. 'vue', 'solid', 'react', 'svelte') */
  framework: string
}
