import type { FluentiBuildConfig } from '@fluenti/core'

export type { RuntimeGeneratorOptions, RuntimeGenerator } from '@fluenti/core/transform'

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
