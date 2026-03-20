import type { Plugin } from 'vite'
import type { FluentiPluginOptions } from '@fluenti/vite-plugin'
import { createFluentiPlugins } from '@fluenti/vite-plugin'
import { reactRuntimeGenerator } from './react-runtime'

export type { FluentiPluginOptions as FluentiReactOptions } from '@fluenti/vite-plugin'

export default function fluentiReact(options?: FluentiPluginOptions): Plugin[] {
  return createFluentiPlugins(
    { ...options, framework: 'react' },
    [],
    reactRuntimeGenerator,
  )
}
