import { resolve } from 'node:path'
import type { RuntimeGenerator, RuntimeGeneratorOptions } from './types'

/**
 * Framework-specific reactive primitives for code generation.
 *
 * Each framework provides string snippets that produce the
 * same semantics using its native reactivity system.
 */
export interface RuntimePrimitives {
  /** Import statements for framework reactivity (e.g. `import { ref } from 'vue'`) */
  imports: string
  /** Expression to create the reactive catalog object (e.g. `shallowReactive({ ...__defaultMsgs })`) */
  catalogInit: string
  /** Expression to create the reactive locale variable (e.g. `ref('${defaultLocale}')`) */
  localeInit: (defaultLocale: string) => string
  /** Expression to create the reactive loading flag (e.g. `ref(false)`) */
  loadingInit: string
  /** Statement to replace the catalog with new messages */
  catalogUpdate: (msgs: string) => string
  /** Statement to merge additional messages into the catalog (for route loading).
   *  Defaults to catalogUpdate if not provided. */
  catalogMerge?: (msgs: string) => string
  /** Statement to update the current locale. Use `$locale` as placeholder. */
  localeUpdate: (locale: string) => string
  /** Statement to set loading state. Use `$value` as placeholder. */
  loadingUpdate: (value: string) => string
  /** Expression to read the current locale value */
  localeRead: string
  /** Runtime key for globalThis Symbol registration (e.g. `fluenti.runtime.vue.v1`) */
  runtimeKey: string
}

/**
 * Create a RuntimeGenerator from framework-specific primitives.
 *
 * This eliminates ~90% duplication across vue-runtime.ts, solid-runtime.ts,
 * and react-runtime.ts by parameterizing only the reactive API differences.
 */
export function createRuntimeGenerator(primitives: RuntimePrimitives): RuntimeGenerator {
  return {
    generateRuntime(options: RuntimeGeneratorOptions): string {
      const { rootDir, catalogDir, catalogExtension, locales, sourceLocale, defaultBuildLocale } = options
      const defaultLocale = defaultBuildLocale || sourceLocale
      const absoluteCatalogDir = resolve(rootDir, catalogDir)
      const ext = catalogExtension || '.js'
      const lazyLocales = locales.filter((locale) => locale !== defaultLocale)

      return `
${primitives.imports}
import __defaultMsgs from '${absoluteCatalogDir}/${defaultLocale}${ext}'

${primitives.catalogInit}
${primitives.localeInit(defaultLocale)}
const __loadedLocales = new Set(['${defaultLocale}'])
${primitives.loadingInit}
const __cache = new Map()
const __normalizeMessages = (mod) => mod.default ?? mod

const __loaders = {
${lazyLocales.map((l) => `  '${l}': () => import('${absoluteCatalogDir}/${l}${ext}'),`).join('\n')}
}

async function __switchLocale(locale) {
  if (__loadedLocales.has(locale)) {
    ${primitives.catalogUpdate('__cache.get(locale) || __defaultMsgs')}
    ${primitives.localeUpdate('locale')}
    return
  }
  ${primitives.loadingUpdate('true')}
  try {
    const mod = __normalizeMessages(await __loaders[locale]())
    __cache.set(locale, mod)
    __loadedLocales.add(locale)
    ${primitives.catalogUpdate('mod')}
    ${primitives.localeUpdate('locale')}
  } finally {
    ${primitives.loadingUpdate('false')}
  }
}

async function __preloadLocale(locale) {
  if (__loadedLocales.has(locale) || !__loaders[locale]) return
  try {
    const mod = __normalizeMessages(await __loaders[locale]())
    __cache.set(locale, mod)
    __loadedLocales.add(locale)
  } catch (e) { console.warn('[fluenti] preload failed:', locale, e) }
}

globalThis[Symbol.for('${primitives.runtimeKey}')] = { __switchLocale, __preloadLocale }

export { __catalog, __switchLocale, __preloadLocale, __currentLocale, __loading, __loadedLocales }
`
    },

    generateRouteRuntime(options: RuntimeGeneratorOptions): string {
      const { rootDir, catalogDir, catalogExtension, locales, sourceLocale, defaultBuildLocale } = options
      const defaultLocale = defaultBuildLocale || sourceLocale
      const absoluteCatalogDir = resolve(rootDir, catalogDir)
      const ext = catalogExtension || '.js'
      const lazyLocales = locales.filter((locale) => locale !== defaultLocale)

      return `
${primitives.imports}
import __defaultMsgs from '${absoluteCatalogDir}/${defaultLocale}${ext}'

${primitives.catalogInit}
${primitives.localeInit(defaultLocale)}
const __loadedLocales = new Set(['${defaultLocale}'])
${primitives.loadingInit}
const __cache = new Map()
const __loadedRoutes = new Set()
const __normalizeMessages = (mod) => mod.default ?? mod

const __loaders = {
${lazyLocales.map((l) => `  '${l}': () => import('${absoluteCatalogDir}/${l}${ext}'),`).join('\n')}
}

const __routeLoaders = {}

function __registerRouteLoader(routeId, locale, loader) {
  const key = routeId + ':' + locale
  __routeLoaders[key] = loader
}

async function __loadRoute(routeId, locale) {
  const key = routeId + ':' + (locale || ${primitives.localeRead})
  if (__loadedRoutes.has(key)) return
  const loader = __routeLoaders[key]
  if (!loader) return
  const mod = __normalizeMessages(await loader())
  ${(primitives.catalogMerge ?? primitives.catalogUpdate)('mod')}
  __loadedRoutes.add(key)
}

async function __switchLocale(locale) {
  if (locale === ${primitives.localeRead}) return
  ${primitives.loadingUpdate('true')}
  try {
    if (__cache.has(locale)) {
      ${primitives.catalogUpdate('__cache.get(locale)')}
    } else {
      const mod = __normalizeMessages(await __loaders[locale]())
      __cache.set(locale, mod)
      ${primitives.catalogUpdate('mod')}
    }
    __loadedLocales.add(locale)
    ${primitives.localeUpdate('locale')}
  } finally {
    ${primitives.loadingUpdate('false')}
  }
}

async function __preloadLocale(locale) {
  if (__cache.has(locale) || !__loaders[locale]) return
  try {
    const mod = __normalizeMessages(await __loaders[locale]())
    __cache.set(locale, mod)
    __loadedLocales.add(locale)
  } catch (e) { console.warn('[fluenti] preload failed:', locale, e) }
}

globalThis[Symbol.for('${primitives.runtimeKey}')] = { __switchLocale, __preloadLocale }

export { __catalog, __switchLocale, __preloadLocale, __loadRoute, __registerRouteLoader, __currentLocale, __loading, __loadedLocales }
`
    },
  }
}
