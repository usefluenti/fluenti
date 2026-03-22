import type { Plugin } from 'vite'
import { createFilter } from 'vite'
import type { FluentiCoreOptions, RuntimeGenerator } from './types'
import type { FluentiBuildConfig } from '@fluenti/core'
import { resolveLocaleCodes } from '@fluenti/core'
import { setResolvedMode, isBuildMode, getPluginEnvironment } from './mode-detect'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)
import { createDebouncedRunner, runExtractCompile } from './dev-runner'
import { transformForDynamicSplit, transformForStaticSplit, injectCatalogImport } from './build-transform'
import { resolveVirtualSplitId, loadVirtualSplitModule } from './virtual-modules'
import { deriveRouteName, parseCompiledCatalog, buildChunkModule, readCatalogSource } from './route-resolve'
import { scopeTransform } from './scope-transform'
import { transformTransComponents } from './trans-transform'
export type { FluentiPluginOptions, FluentiCoreOptions, RuntimeGenerator, RuntimeGeneratorOptions, IdGenerator } from './types'
export { createRuntimeGenerator } from './runtime-template'
export type { RuntimePrimitives } from './runtime-template'
export { resolveVirtualSplitId, loadVirtualSplitModule } from './virtual-modules'
export { setResolvedMode, isBuildMode, getPluginEnvironment } from './mode-detect'

const VIRTUAL_PREFIX = 'virtual:fluenti/messages/'
const RESOLVED_PREFIX = '\0virtual:fluenti/messages/'
type InternalSplitStrategy = FluentiBuildConfig['splitting'] | 'per-route'

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
  // Resolve the full FluentiBuildConfig from the config option
  let fluentiConfig: FluentiBuildConfig | undefined

  function getConfig(cwd?: string): FluentiBuildConfig {
    if (!fluentiConfig) {
      fluentiConfig = resolvePluginConfig(options.config, cwd)
    }
    return fluentiConfig
  }

  // Eagerly resolve config for values needed at plugin construction time
  // (we can't defer these since they're used in resolveId/load which have no cwd context)
  const earlyConfig = resolvePluginConfig(options.config)

  const catalogDir = earlyConfig.compileOutDir.replace(/^\.\//, '')
  const catalogExtension = earlyConfig.catalogExtension ?? '.js'
  const framework = options.framework
  const splitting = (earlyConfig.splitting as InternalSplitStrategy | undefined) ?? false
  const sourceLocale = earlyConfig.sourceLocale
  const localeCodes = resolveLocaleCodes(earlyConfig.locales)
  const defaultBuildLocale = earlyConfig.defaultBuildLocale ?? sourceLocale
  const idGenerator = earlyConfig.idGenerator
  const onBeforeCompile = earlyConfig.onBeforeCompile
  const onAfterCompile = earlyConfig.onAfterCompile

  let rootDir = process.cwd()

  const virtualPlugin: Plugin = {
    name: 'fluenti:virtual',
    configResolved(config) {
      rootDir = config.root
      setResolvedMode(config.command)
    },
    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return '\0' + id
      }
      if (splitting) {
        const resolved = resolveVirtualSplitId(id)
        if (resolved) return resolved
      }
      return undefined
    },
    load(id) {
      if (id.startsWith(RESOLVED_PREFIX)) {
        const locale = id.slice(RESOLVED_PREFIX.length)
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

  const scriptTransformPlugin: Plugin = {
    name: 'fluenti:script-transform',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('node_modules')) return undefined
      if (!id.match(/\.(vue|tsx|jsx|ts|js)(\?|$)/)) return undefined
      if (id.includes('.vue') && !id.includes('type=script')) return undefined

      let result = code
      let changed = false

      // ── <Trans> compile-time optimization (JSX/TSX only) ──────────────
      if (id.match(/\.[jt]sx(\?|$)/) && /<Trans[\s>]/.test(result)) {
        const transResult = transformTransComponents(result)
        if (transResult.transformed) {
          result = transResult.code
          changed = true
        }
      }

      // ── t`` / t() scope-aware transform ────────────────────────────────
      if (hasScopeTransformCandidate(result)) {
        const scoped = scopeTransform(result, {
          framework,
          allowTopLevelImportedT: framework === 'vue' && id.includes('.vue'),
        })
        if (scoped.transformed) {
          return { code: scoped.code, map: null }
        }
      }

      return changed ? { code: result, map: null } : undefined
    },
  }

  // Track module → used hashes for per-route splitting
  const moduleMessages = new Map<string, Set<string>>()

  const buildSplitPlugin: Plugin = {
    name: 'fluenti:build-split',
    transform(code, id) {
      if (!splitting) return undefined
      if (!isBuildMode(getPluginEnvironment(this))) return undefined
      if (id.includes('node_modules')) return undefined
      if (!id.match(/\.(vue|tsx|jsx|ts|js)(\?|$)/)) return undefined

      const strategy = splitting === 'static' ? 'static' : 'dynamic'
      const transformOptions = idGenerator ? { hashFn: idGenerator } : undefined
      const transformed = strategy === 'static'
        ? transformForStaticSplit(code, transformOptions)
        : transformForDynamicSplit(code, transformOptions)

      if (splitting === 'per-route' && transformed.usedHashes.size > 0) {
        moduleMessages.set(id, transformed.usedHashes)
      }

      if (!transformed.needsCatalogImport) return undefined

      const importStrategy = splitting === 'per-route' ? 'per-route' : strategy
      const finalCode = injectCatalogImport(transformed.code, importStrategy, transformed.usedHashes, idGenerator)
      return { code: finalCode, map: null }
    },

    generateBundle(_outputOptions, bundle) {
      if (splitting !== 'per-route') return
      if (moduleMessages.size === 0) return

      const chunkHashes = new Map<string, Set<string>>()
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue
        const hashes = new Set<string>()
        for (const moduleId of Object.keys(chunk.modules)) {
          const modHashes = moduleMessages.get(moduleId)
          if (modHashes) {
            for (const h of modHashes) hashes.add(h)
          }
        }
        if (hashes.size > 0) {
          chunkHashes.set(fileName, hashes)
        }
      }

      if (chunkHashes.size === 0) return

      const hashToChunks = new Map<string, string[]>()
      for (const [chunkName, hashes] of chunkHashes) {
        for (const h of hashes) {
          const chunks = hashToChunks.get(h) ?? []
          chunks.push(chunkName)
          hashToChunks.set(h, chunks)
        }
      }

      const sharedHashes = new Set<string>()
      const routeHashes = new Map<string, Set<string>>()

      for (const [hash, chunks] of hashToChunks) {
        if (chunks.length > 1) {
          sharedHashes.add(hash)
        } else {
          const routeName = deriveRouteName(chunks[0]!)
          const existing = routeHashes.get(routeName) ?? new Set()
          existing.add(hash)
          routeHashes.set(routeName, existing)
        }
      }

      const absoluteCatalogDir = resolve(rootDir, catalogDir)
      for (const locale of localeCodes) {
        const catalogSource = readCatalogSource(absoluteCatalogDir, locale)
        if (!catalogSource) continue
        const catalogExports = parseCompiledCatalog(catalogSource)

        if (sharedHashes.size > 0) {
          const sharedCode = buildChunkModule(sharedHashes, catalogExports)
          this.emitFile({
            type: 'asset',
            fileName: `_fluenti/shared-${locale}.js`,
            source: sharedCode,
          })
        }

        for (const [routeName, hashes] of routeHashes) {
          const routeCode = buildChunkModule(hashes, catalogExports)
          this.emitFile({
            type: 'asset',
            fileName: `_fluenti/${routeName}-${locale}.js`,
            source: routeCode,
          })
        }
      }
    },
  }

  const buildAutoCompile = earlyConfig.buildAutoCompile ?? true

  const buildCompilePlugin: Plugin = {
    name: 'fluenti:build-compile',
    async buildStart() {
      if (!isBuildMode(getPluginEnvironment(this)) || !buildAutoCompile) return
      if (onBeforeCompile) {
        const result = await onBeforeCompile()
        if (result === false) return
      }
      await runExtractCompile({ cwd: rootDir, throwOnError: true, compileOnly: true })
      if (onAfterCompile) {
        await onAfterCompile()
      }
    },
  }

  const devAutoCompile = earlyConfig.devAutoCompile ?? true

  const devPlugin: Plugin = {
    name: 'fluenti:dev',
    configureServer(server) {
      if (!devAutoCompile) return

      // Use include/exclude from resolved config
      const cfg = getConfig(server.config.root)
      const includePatterns = cfg.include ?? ['src/**/*.{vue,tsx,jsx,ts,js}']
      const excludePatterns = cfg.exclude ?? []

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
      if (earlyConfig.parallelCompile) runnerOptions.parallelCompile = true
      if (onBeforeCompile) runnerOptions.onBeforeCompile = onBeforeCompile
      if (onAfterCompile) runnerOptions.onAfterCompile = onAfterCompile
      const debouncedRun = createDebouncedRunner(runnerOptions, earlyConfig.devAutoCompileDelay ?? 300)

      debouncedRun()

      server.watcher.on('change', (file) => {
        if (filter(file)) {
          debouncedRun()
        }
      })
    },
    hotUpdate({ file }) {
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
  // 5. buildSplitPlugin     — rewrites t() calls to catalog refs + emits per-route chunks
  // 6. devPlugin            — file watcher + HMR for dev mode (must be last)
  return [virtualPlugin, ...frameworkPlugins, scriptTransformPlugin, buildCompilePlugin, buildSplitPlugin, devPlugin]
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function hasScopeTransformCandidate(code: string): boolean {
  if (/(?<![.\w$])t\(\s*['"]/.test(code) || /[A-Za-z_$][\w$]*\(\s*\{/.test(code)) {
    return true
  }

  if (/[A-Za-z_$][\w$]*`/.test(code) && (code.includes('useI18n') || code.includes('getI18n'))) {
    return true
  }

  return /import\s*\{[^}]*\bt(?:\s+as\s+[A-Za-z_$][\w$]*)?\b[^}]*\}/.test(code)
    && /@fluenti\/(react|vue|solid|next)/.test(code)
}
