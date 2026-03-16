/**
 * @fluenti/next — Next.js integration for Fluenti.
 *
 * Usage in next.config.ts:
 *
 *   import { withFluenti } from '@fluenti/next'
 *
 *   export default withFluenti({
 *     locales: ['en', 'ja', 'ar'],
 *   })({
 *     reactStrictMode: true,
 *   })
 */

import { resolve, dirname } from 'node:path'
import { watch } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { FluentiNextOptions } from './types'
import { compileAll, type CompileOptions } from './compile'

export type { FluentiNextOptions } from './types'

const LOADER_EXTENSIONS = /\.(tsx|jsx|ts|js)$/

function getLoaderPath(): string {
  try {
    return resolve(dirname(fileURLToPath(import.meta.url)), 'loader.js')
  } catch {
    // CJS fallback
    return resolve(__dirname, 'loader.cjs')
  }
}

/**
 * Creates a Next.js config wrapper that adds Fluenti transforms.
 */
export function withFluenti(options?: FluentiNextOptions) {
  const catalogDir = resolve(options?.catalogDir ?? './locales')
  const compileOutDir = resolve(options?.compileOutDir ?? './src/locales/compiled')
  const sourceLocale = options?.sourceLocale ?? 'en'
  const locales = options?.locales ?? [sourceLocale]
  const format = options?.format ?? 'po'
  const autoCompile = options?.autoCompile ?? true

  // Pass serverModule to the loader via process.env
  // (Turbopack loaders only accept string paths, no options object)
  if (options?.serverModule) {
    process.env['__FLUENTI_SERVER_MODULE'] = options.serverModule
  }

  const compileOptions: CompileOptions = { catalogDir, compileOutDir, locales, format }
  const loaderPath = getLoaderPath()

  let watchStarted = false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (nextConfig: any = {}): any => {
    const existingWebpack = nextConfig.webpack

    const result = { ...nextConfig }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.webpack = (config: any, context: any) => {
      // Add the fluenti loader for tsx/jsx/ts/js files (excluding node_modules)
      config.module.rules.push({
        test: LOADER_EXTENSIONS,
        exclude: /node_modules/,
        use: [{ loader: loaderPath }],
      })

      // In dev mode, auto-compile catalogs and watch for changes
      if (context.dev && autoCompile && !watchStarted) {
        watchStarted = true

        // Initial compile
        try {
          compileAll(compileOptions)
        } catch {
          // Silently skip if catalog files don't exist yet
        }

        // Watch catalog directory for changes
        try {
          const ext = format === 'json' ? '.json' : '.po'
          const watcher = watch(catalogDir, { recursive: true }, (_event, filename) => {
            if (filename && filename.endsWith(ext)) {
              try {
                compileAll(compileOptions)
              } catch {
                // Ignore compile errors during watch — user may be mid-edit
              }
            }
          })

          process.on('exit', () => watcher.close())
        } catch {
          // Watch not supported or dir doesn't exist — skip silently
        }
      }

      // Chain with user's webpack config
      if (typeof existingWebpack === 'function') {
        return existingWebpack(config, context)
      }

      return config
    }

    // Turbopack support (Next.js 15.3+: top-level `turbopack` key)
    const existingTurbopack = nextConfig.turbopack
    if (!existingTurbopack) {
      const loaderRule = { loaders: [loaderPath], as: '*.js' }
      result.turbopack = {
        rules: {
          '*.tsx': loaderRule,
          '*.jsx': loaderRule,
          '*.ts': loaderRule,
          '*.js': loaderRule,
        },
      }
    } else {
      // Merge with existing turbopack config
      const loaderRule = { loaders: [loaderPath], as: '*.js' }
      result.turbopack = {
        ...existingTurbopack,
        rules: {
          '*.tsx': loaderRule,
          '*.jsx': loaderRule,
          '*.ts': loaderRule,
          '*.js': loaderRule,
          ...existingTurbopack.rules,
        },
      }
    }

    return result
  }
}
