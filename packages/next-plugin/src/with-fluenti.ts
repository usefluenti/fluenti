import { resolve, dirname } from 'node:path'
import type { WithFluentConfig } from './types'
import { resolveConfig } from './read-config'
import { generateServerModule } from './generate-server-module'

type NextConfig = Record<string, unknown>

/**
 * Wrap your Next.js config with Fluenti support.
 *
 * Adds a webpack loader that transforms `t\`\`` and `t()` calls,
 * and generates a server module for RSC i18n.
 *
 * @example
 * ```ts
 * // next.config.ts — function style (recommended)
 * import { withFluenti } from '@fluenti/next'
 * export default withFluenti()({ reactStrictMode: true })
 * ```
 *
 * @example
 * ```ts
 * // next.config.ts — direct style
 * import { withFluenti } from '@fluenti/next'
 * export default withFluenti({ reactStrictMode: true })
 * ```
 */
export function withFluenti(fluentConfig?: WithFluentConfig): (nextConfig?: NextConfig) => NextConfig
export function withFluenti(nextConfig: NextConfig): NextConfig
export function withFluenti(
  configOrNext?: WithFluentConfig | NextConfig,
): NextConfig | ((nextConfig?: NextConfig) => NextConfig) {
  if (configOrNext && isNextConfig(configOrNext as NextConfig)) {
    return applyFluenti({}, configOrNext as NextConfig)
  }

  const fluentConfig = (configOrNext ?? {}) as WithFluentConfig
  return function wrappedConfig(nextConfig?: NextConfig): NextConfig {
    return applyFluenti(fluentConfig, nextConfig ?? {})
  }
}

function isNextConfig(obj: NextConfig): boolean {
  const nextKeys = [
    'reactStrictMode', 'experimental', 'images', 'env', 'webpack',
    'rewrites', 'redirects', 'headers', 'pageExtensions', 'output',
    'basePath', 'i18n', 'trailingSlash', 'compiler', 'transpilePackages',
  ]
  return nextKeys.some((key) => key in obj)
}

function applyFluenti(
  fluentConfig: WithFluentConfig,
  nextConfig: NextConfig,
): NextConfig {
  const projectRoot = process.cwd()
  const resolved = resolveConfig(projectRoot, fluentConfig)

  // Generate server module for RSC
  const serverModulePath = generateServerModule(projectRoot, resolved)

  // Resolve the loader path — use import.meta.url for ESM compatibility
  const thisDir = typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(new URL(import.meta.url).pathname)
  const loaderPath = resolve(thisDir, 'loader.js')

  const existingWebpack = nextConfig['webpack'] as
    | ((config: WebpackConfig, options: WebpackOptions) => WebpackConfig)
    | undefined

  return {
    ...nextConfig,
    webpack(config: WebpackConfig, options: WebpackOptions) {
      // Add fluenti loader (enforce: pre — runs before other loaders)
      config.module.rules.push({
        test: /\.[jt]sx?$/,
        enforce: 'pre' as const,
        exclude: [/node_modules/, /\.next/],
        use: [
          {
            loader: loaderPath,
            options: {
              serverModulePath,
            },
          },
        ],
      })

      // Add resolve alias so loader can import from generated server module
      config.resolve = config.resolve ?? {} as WebpackConfig['resolve']
      config.resolve.alias = config.resolve.alias ?? {}
      config.resolve.alias['@fluenti/next/__generated'] = serverModulePath

      // Call user's webpack config if provided
      if (existingWebpack) {
        return existingWebpack(config, options)
      }

      return config
    },
  }
}

// Minimal webpack types for the config function
interface WebpackConfig {
  module: {
    rules: Array<{
      test: RegExp
      enforce?: 'pre' | 'post'
      exclude?: Array<RegExp>
      use: Array<{ loader: string; options: Record<string, unknown> }>
    }>
  }
  resolve: {
    alias?: Record<string, string>
  }
}

interface WebpackOptions {
  isServer: boolean
  dev: boolean
}
