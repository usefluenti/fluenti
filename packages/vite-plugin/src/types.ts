import type { FluentiBuildConfig } from '@fluenti/core'

/** Options passed to RuntimeGenerator methods */
export interface RuntimeGeneratorOptions {
  rootDir: string
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
  /** fluenti.config.ts path or inline config. Auto-discovered by default. */
  config?: string | FluentiBuildConfig
}

/** Internal options used by createFluentiPlugins (includes required framework field) */
export interface FluentiCoreOptions {
  /** fluenti.config.ts path or inline config. Auto-discovered by default. */
  config?: string | FluentiBuildConfig
  /** Framework identifier for scope transform and runtime key (e.g. 'vue', 'solid', 'react', 'svelte') */
  framework: string
}
