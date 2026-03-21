import type { Plugin } from 'vite'
import type { FluentiPluginOptions } from '@fluenti/vite-plugin'
import { createFluentiPlugins } from '@fluenti/vite-plugin'
import { solidRuntimeGenerator } from './solid-runtime'

export type { FluentiPluginOptions as FluentiSolidOptions } from '@fluenti/vite-plugin'

export default function fluentiSolid(options?: FluentiPluginOptions): Plugin[] {
  return createFluentiPlugins(
    { ...(options?.config !== undefined ? { config: options.config } : {}), framework: 'solid' },
    [],
    solidRuntimeGenerator,
  )
}
