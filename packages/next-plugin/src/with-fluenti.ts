import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import type { WithFluentConfig } from './types'
import { resolveConfig } from './read-config'
import { generateServerModule } from './generate-server-module'
import { createDebouncedRunner } from './dev-runner'

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

  // Warn if compiled catalogs directory doesn't exist yet
  const compiledDir = resolve(projectRoot, resolved.compiledDir)
  if (!existsSync(compiledDir)) {
    console.warn(
      `\n[fluenti] Compiled catalogs not found at ${resolved.compiledDir}.\n` +
      `Run: npx fluenti extract && npx fluenti compile\n`,
    )
  }

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

  let buildCompileRan = false

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
      config.resolve.alias['@fluenti/next$'] = serverModulePath

      // Auto compile before production build (run once across server+client passes)
      const buildAutoCompile = fluentConfig.buildAutoCompile ?? true
      if (!options.dev && buildAutoCompile && !buildCompileRan) {
        buildCompileRan = true
        try {
          // Use node -e with dynamic import — avoids CLI binary resolution issues.
          // webpack() is sync, so we use execSync to block until compile finishes.
          const escapedRoot = projectRoot.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
          execSync(
            `node --input-type=module -e "const { runCompile } = await import('@fluenti/cli'); await runCompile('${escapedRoot}')"`,
            { cwd: projectRoot, stdio: 'inherit' },
          )
        } catch {
          // @fluenti/cli not available or compile failed — skip silently
        }
      }

      // Auto extract+compile in dev mode
      const devAutoCompile = fluentConfig.devAutoCompile ?? true
      if (options.dev && devAutoCompile) {
        const devDelay = fluentConfig.devAutoCompileDelay ?? 1000
        const debouncedRun = createDebouncedRunner({ cwd: projectRoot }, devDelay)
        const compiledDirResolved = resolve(projectRoot, resolved.compiledDir)

        config.plugins = config.plugins ?? []
        config.plugins.push({
          apply(compiler: WebpackCompiler) {
            let isFirstBuild = true
            compiler.hooks.watchRun.tapAsync('fluenti-dev', (_compiler: WebpackCompiler, callback: () => void) => {
              if (isFirstBuild) {
                isFirstBuild = false
                debouncedRun()
              }
              const modifiedFiles = _compiler.modifiedFiles
              if (modifiedFiles) {
                const hasSourceChange = [...modifiedFiles].some((f: string) =>
                  /\.[jt]sx?$/.test(f)
                  && !f.includes('node_modules')
                  && !f.includes('.next')
                  && !f.startsWith(compiledDirResolved),
                )
                if (hasSourceChange) {
                  debouncedRun()
                }
              }
              callback()
            })
          },
        })
      }

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
  plugins?: Array<{ apply(compiler: WebpackCompiler): void }>
}

interface WebpackOptions {
  isServer: boolean
  dev: boolean
}

interface WebpackCompiler {
  hooks: {
    watchRun: {
      tapAsync(name: string, cb: (compiler: WebpackCompiler, callback: () => void) => void): void
    }
  }
  modifiedFiles?: Set<string>
}
