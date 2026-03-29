import type { Plugin } from 'vite'
import type { FluentiPluginOptions } from '@fluenti/vite-plugin'
import { createFluentiPlugins } from '@fluenti/vite-plugin'
import { reactRuntimeGenerator } from './react-runtime'

export type { FluentiPluginOptions as FluentiReactOptions } from '@fluenti/vite-plugin'

/**
 * Fluenti React Vite plugin.
 *
 * @example Minimal — no fluenti.config.ts needed
 * ```ts
 * // vite.config.ts
 * import fluentiReact from '@fluenti/react/vite-plugin'
 *
 * export default defineConfig({
 *   plugins: [fluentiReact({ config: { locales: ['en', 'ja'] } })],
 * })
 * ```
 *
 * @example With fluenti.config.ts (for advanced options)
 * ```ts
 * export default defineConfig({
 *   plugins: [fluentiReact()],  // auto-reads fluenti.config.ts
 * })
 * ```
 */
export default function fluentiReact(options?: FluentiPluginOptions): Plugin[] {
  return createFluentiPlugins(
    { ...(options?.config !== undefined ? { config: options.config } : {}), framework: 'react' },
    [],
    reactRuntimeGenerator,
  )
}
