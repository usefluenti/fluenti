import type { Plugin } from 'vite'
import type { FluentiPluginOptions } from '@fluenti/vite-plugin'
import { createFluentiPlugins } from '@fluenti/vite-plugin'
import { transformVtDirectives } from '@fluenti/vite-plugin/sfc-transform'
import { vueRuntimeGenerator } from './vue-runtime'

export type { FluentiPluginOptions as FluentiVueOptions } from '@fluenti/vite-plugin'

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
    { ...options, framework: 'vue' },
    [vueTemplatePlugin],
    vueRuntimeGenerator,
  )
}
