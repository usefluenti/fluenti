import type { Plugin } from 'vite'
import type { FluentiCoreOptions, RuntimeGenerator } from './types'
import { setResolvedMode, isBuildMode, getPluginEnvironment } from './mode-detect'
import { resolve } from 'node:path'
import { createDebouncedRunner, runExtractCompile } from './dev-runner'
import { transformForDynamicSplit, transformForStaticSplit, injectCatalogImport } from './build-transform'
import { resolveVirtualSplitId, loadVirtualSplitModule } from './virtual-modules'
import { deriveRouteName, parseCompiledCatalog, buildChunkModule, readCatalogSource } from './route-resolve'
import { scopeTransform } from './scope-transform'
import { transformTransComponents } from './trans-transform'
export type { FluentiPluginOptions, FluentiCoreOptions, RuntimeGenerator, RuntimeGeneratorOptions, IdGenerator } from './types'
export { resolveVirtualSplitId, loadVirtualSplitModule } from './virtual-modules'
export { setResolvedMode, isBuildMode, getPluginEnvironment } from './mode-detect'

const VIRTUAL_PREFIX = 'virtual:fluenti/messages/'
const RESOLVED_PREFIX = '\0virtual:fluenti/messages/'
type InternalSplitStrategy = FluentiCoreOptions['splitting'] | 'per-route'

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
  const catalogDir = options.catalogDir ?? 'src/locales/compiled'
  const catalogExtension = options.catalogExtension ?? '.js'
  const framework = options.framework
  const splitting = (options.splitting as InternalSplitStrategy | undefined) ?? false
  const sourceLocale = options.sourceLocale ?? 'en'
  const locales = options.locales ?? [sourceLocale]
  const defaultBuildLocale = options.defaultBuildLocale ?? sourceLocale
  const idGenerator = options.idGenerator
  const onBeforeCompile = options.onBeforeCompile
  const onAfterCompile = options.onAfterCompile

  const virtualPlugin: Plugin = {
    name: 'fluenti:virtual',
    configResolved(config) {
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
          catalogDir,
          catalogExtension,
          locales,
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

      const absoluteCatalogDir = resolve(process.cwd(), catalogDir)
      for (const locale of locales) {
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

  const buildAutoCompile = options.buildAutoCompile ?? true

  const buildCompilePlugin: Plugin = {
    name: 'fluenti:build-compile',
    async buildStart() {
      if (!isBuildMode(getPluginEnvironment(this)) || !buildAutoCompile) return
      if (onBeforeCompile) {
        const result = await onBeforeCompile()
        if (result === false) return
      }
      const cwd = process.cwd()
      await runExtractCompile({ cwd, throwOnError: true, compileOnly: true })
      if (onAfterCompile) {
        await onAfterCompile()
      }
    },
  }

  const devAutoCompile = options.devAutoCompile ?? true
  const includePatterns = options.include ?? ['src/**/*.{vue,tsx,jsx,ts,js}']

  const devPlugin: Plugin = {
    name: 'fluenti:dev',
    configureServer(server) {
      if (!devAutoCompile) return

      const runnerOptions: Parameters<typeof createDebouncedRunner>[0] = {
        cwd: server.config.root,
        onSuccess: () => {
          // Existing hotUpdate will pick up catalog changes
        },
      }
      if (onBeforeCompile) runnerOptions.onBeforeCompile = onBeforeCompile
      if (onAfterCompile) runnerOptions.onAfterCompile = onAfterCompile
      const debouncedRun = createDebouncedRunner(runnerOptions)

      debouncedRun()

      server.watcher.on('change', (file) => {
        if (matchesInclude(file, includePatterns) && !file.includes(catalogDir)) {
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

  return [virtualPlugin, ...frameworkPlugins, scriptTransformPlugin, buildCompilePlugin, buildSplitPlugin, devPlugin]
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function matchesInclude(file: string, patterns: string[]): boolean {
  const extMatch = /\.(vue|tsx|jsx|ts|js)$/.test(file)
  if (!extMatch) return false
  if (file.includes('node_modules')) return false
  return patterns.some((p) => {
    const dirPart = p.split('*')[0] ?? ''
    return dirPart === '' || file.includes(dirPart.replace('./', ''))
  })
}

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
