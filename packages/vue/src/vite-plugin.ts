import type { Plugin } from 'vite'
import type { FluentiPluginOptions } from '@fluenti/vite-plugin'
import { createFluentiPlugins } from '@fluenti/vite-plugin'
import { transformVtDirectives } from '@fluenti/vite-plugin/sfc-transform'
import { vueRuntimeGenerator } from './vue-runtime'

export type { FluentiPluginOptions as FluentiVueOptions } from '@fluenti/vite-plugin'

/**
 * Fluenti Vue 3 Vite plugin.
 *
 * @example Minimal — no fluenti.config.ts needed
 * ```ts
 * // vite.config.ts
 * import fluentiVue from '@fluenti/vue/vite-plugin'
 *
 * export default defineConfig({
 *   plugins: [fluentiVue({ config: { locales: ['en', 'ja'] } })],
 * })
 * ```
 *
 * @example With fluenti.config.ts (for advanced options)
 * ```ts
 * export default defineConfig({
 *   plugins: [fluentiVue()],  // auto-reads fluenti.config.ts
 * })
 * ```
 */
export default function fluentiVue(options?: FluentiPluginOptions): Plugin[] {
  const vueTemplatePlugin: Plugin = {
    name: 'fluenti:vue-template',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.vue')) return undefined
      if (!/\bv-t\b/.test(code) && !/<Trans[\s>]/.test(code) && !/<Plural[\s/>]/.test(code)) return undefined

      const transformed = transformVtDirectives(code)
      if (transformed === code) return undefined

      return { code: transformed, map: null }
    },
  }

  return createFluentiPlugins(
    { ...(options?.config !== undefined ? { config: options.config } : {}), framework: 'vue' },
    [vueTemplatePlugin],
    vueRuntimeGenerator,
  )
}
