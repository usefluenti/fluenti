import type { Plugin } from 'vite'
import type { FluentiPluginOptions } from '@fluenti/vite-plugin'
import { createFluentiPlugins } from '@fluenti/vite-plugin'
import { solidRuntimeGenerator } from './solid-runtime'

export type { FluentiPluginOptions as FluentiSolidOptions } from '@fluenti/vite-plugin'

/**
 * Fluenti SolidJS Vite plugin.
 *
 * @example Minimal — no fluenti.config.ts needed
 * ```ts
 * // vite.config.ts
 * import fluentiSolid from '@fluenti/solid/vite-plugin'
 *
 * export default defineConfig({
 *   plugins: [fluentiSolid({ config: { locales: ['en', 'ja'] } })],
 * })
 * ```
 *
 * @example With fluenti.config.ts (for advanced options)
 * ```ts
 * export default defineConfig({
 *   plugins: [fluentiSolid()],  // auto-reads fluenti.config.ts
 * })
 * ```
 */
export default function fluentiSolid(options?: FluentiPluginOptions): Plugin[] {
  return createFluentiPlugins(
    { ...(options?.config !== undefined ? { config: options.config } : {}), framework: 'solid' },
    [],
    solidRuntimeGenerator,
  )
}
