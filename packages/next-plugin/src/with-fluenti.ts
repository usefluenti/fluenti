import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { WithFluentConfig } from './types'
import { resolveConfig } from './read-config'
import { generateServerModule } from './generate-server-module'
import { startDevWatcher } from './dev-watcher'

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
  if (configOrNext && !isFluentConfig(configOrNext as Record<string, unknown>)) {
    // Has keys but none are fluent-specific → treat as NextConfig
    return applyFluenti({}, configOrNext as NextConfig)
  }

  const fluentConfig = (configOrNext ?? {}) as WithFluentConfig
  return function wrappedConfig(nextConfig?: NextConfig): NextConfig {
    return applyFluenti(fluentConfig, nextConfig ?? {})
  }
}

function isFluentConfig(obj: Record<string, unknown>): boolean {
  const fluentOnlyKeys = [
    'config', 'serverModule', 'serverModuleOutDir', 'resolveLocale',
    'cookieName', 'loaderEnforce',
  ]
  return fluentOnlyKeys.some((key) => key in obj)
}

function applyFluenti(
  fluentConfig: WithFluentConfig,
  nextConfig: NextConfig,
): NextConfig {
  const projectRoot = process.cwd()
  const resolved = resolveConfig(projectRoot, fluentConfig)
  const fluentiConfig = resolved.fluentiConfig
  const compiledDir = fluentiConfig.compileOutDir

  // Warn if compiled catalogs directory doesn't exist yet
  const compiledDirAbs = resolve(projectRoot, compiledDir)
  if (!existsSync(compiledDirAbs)) {
    console.warn(
      `\n[fluenti] Compiled catalogs not found at ${compiledDir}.\n` +
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

  // ── Turbopack config ──────────────────────────────────────────────
  // Turbopack loader-runner supports webpack loaders via turbopack.rules.
  // Use package name (not file path) — Turbopack resolves loaders as packages,
  // file paths trigger static analysis errors (TP1006) in the loader-runner.
  const fluentTurboRules = Object.fromEntries(
    ['*.ts', '*.tsx', '*.js', '*.jsx'].map((ext) => [
      ext,
      {
        condition: { not: 'foreign' },
        loaders: ['@fluenti/next/loader'],
      },
    ]),
  )

  // Turbopack resolveAlias requires relative paths (absolute paths get
  // misinterpreted as "./abs/path"). Use "./" + relative-from-cwd.
  const relativeServerModule = './' + serverModulePath
    .replace(projectRoot + '/', '')
    .replace(projectRoot + '\\', '')
  const fluentTurboAlias: Record<string, string> = {
    '@fluenti/next': relativeServerModule,
  }

  // ── Dev auto-compile via standalone watcher (works with both webpack & Turbopack) ──
  const isDev = process.env['NODE_ENV'] === 'development'
    || process.argv.some(a => a === 'dev')
  const devAutoCompile = fluentiConfig.devAutoCompile ?? true

  if (isDev && devAutoCompile) {
    const watcherOpts: Parameters<typeof startDevWatcher>[0] = {
      cwd: projectRoot,
      compiledDir,
      delay: fluentiConfig.devAutoCompileDelay ?? 1000,
    }
    if (fluentiConfig.parallelCompile) watcherOpts.parallelCompile = true
    if (fluentiConfig.include) watcherOpts.include = fluentiConfig.include
    if (fluentiConfig.exclude) watcherOpts.exclude = fluentiConfig.exclude
    startDevWatcher(watcherOpts)
  }

  return {
    ...nextConfig,
    turbopack: mergeTurbopackConfig(
      nextConfig['turbopack'] as Record<string, unknown> | undefined,
      { rules: fluentTurboRules, resolveAlias: fluentTurboAlias },
    ),
    webpack(config: WebpackConfig, options: WebpackOptions) {
      // Add fluenti loader
      const loaderEnforce = fluentConfig.loaderEnforce === undefined && !('loaderEnforce' in (fluentConfig as Record<string, unknown>))
        ? 'pre' as const
        : fluentConfig.loaderEnforce
      config.module.rules.push({
        test: /\.[jt]sx?$/,
        ...(loaderEnforce ? { enforce: loaderEnforce } : {}),
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

      // Auto compile before production build via async beforeRun hook
      const buildAutoCompile = fluentiConfig.buildAutoCompile ?? true
      if (!options.dev && buildAutoCompile) {
        config.plugins = config.plugins ?? []
        config.plugins.push({
          apply(compiler: WebpackCompiler) {
            compiler.hooks.beforeRun.tapPromise('fluenti-compile', async () => {
              if (buildCompileRan) return
              buildCompileRan = true
              try {
                // @ts-expect-error — @fluenti/cli is an optional peer dependency
                const { runCompile } = await import('@fluenti/cli')
                await runCompile(projectRoot, fluentiConfig.parallelCompile ? { parallel: true } : undefined)
              } catch {
                // @fluenti/cli not available or compile failed — skip silently
              }
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

function mergeTurbopackConfig(
  existing: Record<string, unknown> | undefined,
  fluenti: { rules: Record<string, unknown>; resolveAlias: Record<string, string> },
): Record<string, unknown> {
  const base = existing ?? {}
  const userRules = (base['rules'] as Record<string, unknown>) ?? {}

  // Warn when user rules override fluenti's source-file rules
  const fluentKeys = Object.keys(fluenti.rules)
  const overlapping = fluentKeys.filter(k => k in userRules)
  if (overlapping.length > 0) {
    console.warn(
      `[fluenti] Your turbopack.rules override Fluenti's loader for: ${overlapping.join(', ')}.\n` +
      `  Fluenti's t\`\` transform will NOT run on these file types.\n` +
      `  If this is intentional, you can suppress this warning with { devAutoCompile: false }.`,
    )
  }

  return {
    ...base,
    rules: { ...fluenti.rules, ...userRules },
    resolveAlias: { ...fluenti.resolveAlias, ...(base['resolveAlias'] as Record<string, string> ?? {}) },
  }
}

// Minimal webpack types for the config function
interface WebpackCompiler {
  hooks: {
    beforeRun: {
      tapPromise(name: string, cb: () => Promise<void>): void
    }
  }
}

interface WebpackConfig {
  module: {
    rules: Array<Record<string, unknown>>
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
