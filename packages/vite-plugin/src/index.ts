import type { Plugin } from 'vite'
import { createFilter } from 'vite'
import type { FluentiCoreOptions, RuntimeGenerator } from './types'
import type { FluentiBuildConfig } from '@fluenti/core/internal'
import { resolveLocaleCodes } from '@fluenti/core/internal'
import { setResolvedMode, isBuildMode, getPluginEnvironment } from './mode-detect'
import { createRequire } from 'node:module'

const _require = createRequire(
  typeof __filename !== 'undefined' ? __filename : import.meta.url,
)
import { createDebouncedRunner, runExtractCompile } from './dev-runner'
import { transformForDynamicSplit, transformForStaticSplit, injectCatalogImport } from './build-transform'
import { resolveVirtualSplitId, loadVirtualSplitModule } from './virtual-modules'
import { createTransformPipeline, hasScopeTransformCandidate } from '@fluenti/core/transform'
export type { FluentiPluginOptions, FluentiCoreOptions, RuntimeGenerator, RuntimeGeneratorOptions, IdGenerator } from './types'
export { createRuntimeGenerator } from './runtime-template'
export type { RuntimePrimitives } from './runtime-template'
export { resolveVirtualSplitId, loadVirtualSplitModule } from './virtual-modules'
export { setResolvedMode, isBuildMode, getPluginEnvironment } from './mode-detect'

const VIRTUAL_PREFIX = 'virtual:fluenti/messages/'
const RESOLVED_PREFIX = '\0virtual:fluenti/messages/'

/**
 * Resolve a config option (string path, inline object, or undefined) into a full FluentiBuildConfig.
 */
function resolvePluginConfig(configOption?: string | FluentiBuildConfig, cwd?: string): FluentiBuildConfig {
  if (typeof configOption === 'object') {
    // Inline config — merge with defaults
    const { DEFAULT_FLUENTI_CONFIG } = _require('@fluenti/core/config') as {
      DEFAULT_FLUENTI_CONFIG: FluentiBuildConfig
    }
    return { ...DEFAULT_FLUENTI_CONFIG, ...configOption }
  }
  // string → specified path; undefined → auto-discover
  const { loadConfigSync: loadSync } = _require('@fluenti/core/config') as {
    loadConfigSync: (configPath?: string, cwd?: string) => FluentiBuildConfig
  }
  return loadSync(
    typeof configOption === 'string' ? configOption : undefined,
    cwd,
  )
}

// ─── Public factory for framework packages ─────────────────────────────────

/**
 * Create the Fluenti plugin pipeline.
 * Framework packages call this with their framework-specific plugins and runtime generator.
 */
export function createFluentiPlugins(
  options: FluentiCoreOptions,
  frameworkPlugins: Plugin[],
  runtimeGenerator?: RuntimeGenerator,
): Plugin[] {
  let fluentiConfig: FluentiBuildConfig | undefined
  let rootDir = process.cwd()

  function getConfig(cwd?: string): FluentiBuildConfig {
    const effectiveCwd = cwd ?? rootDir
    if (!fluentiConfig) {
      fluentiConfig = resolvePluginConfig(options.config, effectiveCwd)
    }
    return fluentiConfig
  }

  const framework = options.framework

  function getResolvedSettings(cwd?: string) {
    const config = getConfig(cwd)
    const catalogDir = config.compileOutDir.replace(/^\.\//, '')
    const catalogExtension = config.catalogExtension ?? '.js'
    const rawSplitting = config.splitting ?? false
    if (rawSplitting && rawSplitting !== 'dynamic' && rawSplitting !== 'static') {
      console.warn(`[fluenti] Invalid splitting value "${rawSplitting}". Expected 'dynamic', 'static', or false. Falling back to 'dynamic'.`)
    }
    const splitting = rawSplitting === 'static' ? 'static' as const : rawSplitting ? 'dynamic' as const : false as const
    const sourceLocale = config.sourceLocale
    const localeCodes = resolveLocaleCodes(config.locales)
    const defaultBuildLocale = config.defaultBuildLocale ?? sourceLocale
    return {
      config,
      catalogDir,
      catalogExtension,
      splitting,
      sourceLocale,
      localeCodes,
      defaultBuildLocale,
    }
  }

  const virtualPlugin: Plugin = {
    name: 'fluenti:virtual',
    configResolved(config) {
      rootDir = config.root
      fluentiConfig = resolvePluginConfig(options.config, rootDir)
      setResolvedMode(config.command)
    },
    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return '\0' + id
      }
      const { splitting } = getResolvedSettings()
      if (splitting) {
        const resolved = resolveVirtualSplitId(id)
        if (resolved) return resolved
      }
      return undefined
    },
    load(id) {
      const {
        catalogDir,
        catalogExtension,
        splitting,
        localeCodes,
        sourceLocale,
        defaultBuildLocale,
      } = getResolvedSettings()
      if (id.startsWith(RESOLVED_PREFIX)) {
        const locale = id.slice(RESOLVED_PREFIX.length)
        if (!localeCodes.includes(locale)) {
          return undefined
        }
        const catalogPath = `${catalogDir}/${locale}${catalogExtension}`
        return `export { default } from '${catalogPath}'`
      }
      if (splitting) {
        const result = loadVirtualSplitModule(id, {
          rootDir,
          catalogDir,
          catalogExtension,
          locales: localeCodes,
          sourceLocale,
          defaultBuildLocale,
          framework,
          runtimeGenerator,
        })
        if (result) return result
      }
      return undefined
    },
  }

  const pipeline = createTransformPipeline({ framework })

  const scriptTransformPlugin: Plugin = {
    name: 'fluenti:script-transform',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('node_modules')) return undefined
      if (!id.match(/\.(vue|tsx|jsx|ts|js)(\?|$)/)) return undefined
      if (id.includes('.vue') && !id.includes('type=script')) return undefined

      // Vue .vue files need allowTopLevelImportedT for top-level `import { t }`
      const isVueSfc = framework === 'vue' && id.includes('.vue')

      let result = code
      let changed = false

      // ── <Trans> compile-time optimization (JSX/TSX only) ──────────────
      if (id.match(/\.[jt]sx(\?|$)/) && /<Trans[\s>]/.test(result)) {
        const transResult = pipeline.transformTrans(result)
        if (transResult.transformed) {
          result = transResult.code
          changed = true
        }
      }

      // ── t`` / t() scope-aware transform ────────────────────────────────
      if (hasScopeTransformCandidate(result)) {
        const scoped = pipeline.transformScope(result,
          isVueSfc ? { allowTopLevelImportedT: true } : undefined,
        )
        if (scoped.transformed) {
          return { code: scoped.code, map: null }
        }
      }

      return changed ? { code: result, map: null } : undefined
    },
  }

  const buildSplitPlugin: Plugin = {
    name: 'fluenti:build-split',
    transform(code, id) {
      const { splitting, config } = getResolvedSettings()
      if (!splitting) return undefined
      if (!isBuildMode(getPluginEnvironment(this))) return undefined
      if (id.includes('node_modules')) return undefined
      if (!id.match(/\.(vue|tsx|jsx|ts|js)(\?|$)/)) return undefined

      const strategy = splitting === 'static' ? 'static' : 'dynamic'
      const transformOptions = config.idGenerator ? { hashFn: config.idGenerator } : undefined
      const transformed = strategy === 'static'
        ? transformForStaticSplit(code, transformOptions)
        : transformForDynamicSplit(code, transformOptions)

      if (!transformed.needsCatalogImport) return undefined

      const finalCode = injectCatalogImport(
        transformed.code,
        strategy,
        transformed.usedHashes,
        config.idGenerator,
      )
      return { code: finalCode, map: null }
    },
  }

  const buildCompilePlugin: Plugin = {
    name: 'fluenti:build-compile',
    async buildStart() {
      const { config } = getResolvedSettings()
      if (!isBuildMode(getPluginEnvironment(this))) return
      const buildAutoCompile = config.buildAutoCompile ?? true
      if (!buildAutoCompile) return
      if (config.onBeforeCompile) {
        const result = await config.onBeforeCompile()
        if (result === false) return
      }
      await runExtractCompile({ cwd: rootDir, throwOnError: true, compileOnly: true })
      if (config.onAfterCompile) {
        await config.onAfterCompile()
      }
    },
  }

  const devPlugin: Plugin = {
    name: 'fluenti:dev',
    configureServer(server) {
      const { config, catalogDir } = getResolvedSettings(server.config.root)
      const devAutoCompile = config.devAutoCompile ?? true
      if (!devAutoCompile) return

      const includePatterns = config.include ?? ['src/**/*.{vue,tsx,jsx,ts,js}']
      const excludePatterns = config.exclude ?? []

      const filter = createFilter(includePatterns, [
        ...excludePatterns,
        '**/node_modules/**',
        `**/${catalogDir}/**`,
      ])

      const runnerOptions: Parameters<typeof createDebouncedRunner>[0] = {
        cwd: server.config.root,
        onSuccess: () => {
          // Existing hotUpdate will pick up catalog changes
        },
      }
      if (config.parallelCompile) runnerOptions.parallelCompile = true
      if (config.onBeforeCompile) runnerOptions.onBeforeCompile = config.onBeforeCompile
      if (config.onAfterCompile) runnerOptions.onAfterCompile = config.onAfterCompile
      const debouncedRun = createDebouncedRunner(runnerOptions, config.devAutoCompileDelay ?? 500)

      debouncedRun()

      server.watcher.on('change', (file) => {
        if (filter(file)) {
          debouncedRun()
        }
      })
    },
    hotUpdate({ file }) {
      const { catalogDir } = getResolvedSettings()
      if (file.includes(catalogDir)) {
        const modules = [...this.environment.moduleGraph.urlToModuleMap.entries()]
          .filter(([url]) => url.includes('virtual:fluenti'))
          .map(([, mod]) => mod)

        if (modules.length > 0) {
          return modules
        }
      }
      return undefined
    },
  }

  // Plugin order matters:
  // 1. virtualPlugin       — resolves virtual:fluenti/* module IDs (must be first)
  // 2. frameworkPlugins     — framework-specific template transforms (e.g., Vue v-t directive)
  //                           must run after virtual resolution but before script transforms
  // 3. scriptTransformPlugin — t()/t`` scope transforms + <Trans> optimization (enforce: 'pre')
  // 4. buildCompilePlugin   — triggers extract+compile before the build starts
  // 5. buildSplitPlugin     — rewrites t() calls to catalog refs (dynamic/static)
  // 6. devPlugin            — file watcher + HMR for dev mode (must be last)
  return [virtualPlugin, ...frameworkPlugins, scriptTransformPlugin, buildCompilePlugin, buildSplitPlugin, devPlugin]
}
