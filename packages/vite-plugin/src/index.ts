import type { Plugin } from 'vite'
import type { FluentiPluginOptions } from './types'
import { setResolvedMode, isBuildMode } from './mode-detect'
import { resolve } from 'node:path'
import { createDebouncedRunner } from '@fluenti/core/internal'
import { transformForDynamicSplit, transformForStaticSplit, injectCatalogImport } from './build-transform'
import { resolveVirtualSplitId, loadVirtualSplitModule } from './virtual-modules'
import { deriveRouteName, parseCompiledCatalog, buildChunkModule, readCatalogSource } from './route-resolve'
import { scopeTransform } from './scope-transform'
import { transformTransComponents } from './trans-transform'
import { detectFramework } from './framework-detect'
import { transformVtDirectives } from './sfc-transform'
import { transformSolidJsx } from './solid-jsx-transform'

export type { FluentiPluginOptions } from './types'

const VIRTUAL_PREFIX = 'virtual:fluenti/messages/'
const RESOLVED_PREFIX = '\0virtual:fluenti/messages/'
type InternalSplitStrategy = FluentiPluginOptions['splitting'] | 'per-route'

// ─── Plugin entry ────────────────────────────────────────────────────────────

/** Fluenti Vite plugin */
export default function fluentiPlugin(options?: FluentiPluginOptions): Plugin[] {
  const catalogDir = options?.catalogDir ?? 'src/locales/compiled'
  const frameworkOption = options?.framework ?? 'auto'
  const splitting = (options?.splitting as InternalSplitStrategy | undefined) ?? false
  const sourceLocale = options?.sourceLocale ?? 'en'
  const locales = options?.locales ?? [sourceLocale]
  const defaultBuildLocale = options?.defaultBuildLocale ?? sourceLocale
  let detectedFramework: 'vue' | 'solid' | 'react' = 'vue'

  const virtualPlugin: Plugin = {
    name: 'fluenti:virtual',
    configResolved(config) {
      setResolvedMode(config.command)
    },
    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return '\0' + id
      }
      // Handle split-mode virtual modules
      if (splitting) {
        const resolved = resolveVirtualSplitId(id)
        if (resolved) return resolved
      }
      return undefined
    },
    load(id) {
      if (id.startsWith(RESOLVED_PREFIX)) {
        const locale = id.slice(RESOLVED_PREFIX.length)
        const catalogPath = `${catalogDir}/${locale}.js`
        return `export { default } from '${catalogPath}'`
      }
      // Handle split-mode virtual modules
      if (splitting) {
        const result = loadVirtualSplitModule(id, {
          catalogDir,
          locales,
          sourceLocale,
          defaultBuildLocale,
          framework: detectedFramework,
        })
        if (result) return result
      }
      return undefined
    },
  }

  const vueTemplatePlugin: Plugin = {
    name: 'fluenti:vue-template',
    enforce: 'pre',

    // SFC pre-transform: rewrites v-t directives, <Trans>, and <Plural> in <template>
    // before Vue compiler runs. Manual compiler-level transforms are treated as
    // internal implementation details; the supported public path is this plugin.
    transform(code, id) {
      if (!id.endsWith('.vue')) return undefined
      if (!/\bv-t\b/.test(code) && !/<Trans[\s>]/.test(code) && !/<Plural[\s/>]/.test(code)) return undefined

      const transformed = transformVtDirectives(code)
      if (transformed === code) return undefined

      return { code: transformed, map: null }
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
        const framework = frameworkOption === 'auto'
          ? detectFramework(id, result)
          : frameworkOption

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
    // No enforce — runs AFTER @vitejs/plugin-vue compiles templates to JavaScript.
    // With enforce: 'pre', this would see raw SFC <template> blocks before Vue
    // compilation, which breaks import injection (imports land outside <script>).
    transform(code, id) {
      if (!splitting) return undefined
      if (!isBuildMode((this as any).environment)) return undefined
      if (id.includes('node_modules')) return undefined
      if (!id.match(/\.(vue|tsx|jsx|ts|js)(\?|$)/)) return undefined

      // Detect framework for this file
      if (frameworkOption === 'auto') {
        detectedFramework = detectFramework(id, code)
      } else {
        detectedFramework = frameworkOption
      }

      // per-route uses the same transform as dynamic ($t → __catalog._hash)
      const strategy = splitting === 'static' ? 'static' : 'dynamic'
      const transformed = strategy === 'static'
        ? transformForStaticSplit(code)
        : transformForDynamicSplit(code)

      // Track hashes per module for per-route generateBundle
      if (splitting === 'per-route' && transformed.usedHashes.size > 0) {
        moduleMessages.set(id, transformed.usedHashes)
      }

      if (!transformed.needsCatalogImport) return undefined

      const importStrategy = splitting === 'per-route' ? 'per-route' : strategy
      const finalCode = injectCatalogImport(transformed.code, importStrategy, transformed.usedHashes)
      return { code: finalCode, map: null }
    },

    generateBundle(_outputOptions, bundle) {
      if (splitting !== 'per-route') return
      if (moduleMessages.size === 0) return

      // 1. Map chunks → hashes via moduleMessages
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

      // 2. Classify: shared (≥2 chunks) vs route-specific (1 chunk)
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

      // 3. Read compiled catalogs and emit chunk files
      const absoluteCatalogDir = resolve(process.cwd(), catalogDir)
      for (const locale of locales) {
        const catalogSource = readCatalogSource(absoluteCatalogDir, locale)
        if (!catalogSource) continue
        const catalogExports = parseCompiledCatalog(catalogSource)

        // Emit shared chunk
        if (sharedHashes.size > 0) {
          const sharedCode = buildChunkModule(sharedHashes, catalogExports)
          this.emitFile({
            type: 'asset',
            fileName: `_fluenti/shared-${locale}.js`,
            source: sharedCode,
          })
        }

        // Emit per-route chunks
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

  const solidJsxPlugin: Plugin = {
    name: 'fluenti:solid-jsx',
    enforce: 'pre',
    transform(code, id) {
      if (!id.match(/\.[tj]sx(\?|$)/)) return undefined
      if (id.includes('node_modules')) return undefined
      if (!/<Trans[\s>]/.test(code) && !/<Plural[\s/>]/.test(code)) return undefined

      // Only run when framework is solid or auto-detected as solid
      const framework = frameworkOption === 'auto'
        ? detectFramework(id, code)
        : frameworkOption
      if (framework !== 'solid') return undefined

      const transformed = transformSolidJsx(code)
      if (!transformed.changed) return undefined

      return { code: transformed.code, map: null }
    },
  }

  const devAutoCompile = options?.devAutoCompile ?? true
  const includePatterns = options?.include ?? ['src/**/*.{vue,tsx,jsx,ts,js}']

  function matchesInclude(file: string, patterns: string[]): boolean {
    // Simple extension + path check (avoids adding picomatch dependency)
    const extMatch = /\.(vue|tsx|jsx|ts|js)$/.test(file)
    if (!extMatch) return false
    if (file.includes('node_modules')) return false
    // Check if file path matches any of the include directory prefixes
    return patterns.some((p) => {
      const dirPart = p.split('*')[0] ?? ''
      return dirPart === '' || file.includes(dirPart.replace('./', ''))
    })
  }

  const devPlugin: Plugin = {
    name: 'fluenti:dev',
    configureServer(server) {
      if (!devAutoCompile) return

      const debouncedRun = createDebouncedRunner({
        cwd: server.config.root,
        onSuccess: () => {
          // Existing hotUpdate will pick up catalog changes
        },
      })

      // Initial run on server start
      debouncedRun()

      // Watch source files for changes
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

  return [virtualPlugin, vueTemplatePlugin, solidJsxPlugin, scriptTransformPlugin, buildSplitPlugin, devPlugin]
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
