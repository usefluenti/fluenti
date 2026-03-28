import { resolve } from 'node:path'

/** Options passed to RuntimeGenerator methods. */
export interface RuntimeGeneratorOptions {
  rootDir: string
  catalogDir: string
  catalogExtension: string
  locales: string[]
  sourceLocale: string
  defaultBuildLocale: string
}

/** Framework-specific virtual module runtime generator. */
export interface RuntimeGenerator {
  /** Generate the main reactive runtime module (virtual:fluenti/runtime). */
  generateRuntime(options: RuntimeGeneratorOptions): string
}

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
let __switchId = 0

const __loaders = {
${lazyLocales.map((l) => `  '${l}': () => import('${absoluteCatalogDir}/${l}${ext}'),`).join('\n')}
}

async function __switchLocale(locale) {
  if (__loadedLocales.has(locale)) {
    ${primitives.catalogUpdate('__cache.get(locale) || __defaultMsgs')}
    ${primitives.localeUpdate('locale')}
    return
  }
  if (!__loaders[locale]) {
    console.warn('[fluenti] No loader for locale:', locale)
    return
  }
  const thisId = ++__switchId
  ${primitives.loadingUpdate('true')}
  try {
    const mod = __normalizeMessages(await __loaders[locale]())
    if (thisId !== __switchId) return
    __cache.set(locale, mod)
    __loadedLocales.add(locale)
    ${primitives.catalogUpdate('mod')}
    ${primitives.localeUpdate('locale')}
  } catch (e) {
    if (thisId === __switchId) {
      console.warn('[fluenti] locale switch failed:', locale, e)
    }
  } finally {
    if (thisId === __switchId) {
      ${primitives.loadingUpdate('false')}
    }
  }
}

const __preloadPromises = new Map()

async function __preloadLocale(locale) {
  if (__loadedLocales.has(locale) || !__loaders[locale]) return
  if (__preloadPromises.has(locale)) return __preloadPromises.get(locale)
  const p = (async () => {
    try {
      const mod = __normalizeMessages(await __loaders[locale]())
      __cache.set(locale, mod)
      __loadedLocales.add(locale)
    } catch (e) { console.warn('[fluenti] preload failed:', locale, e) }
    finally { __preloadPromises.delete(locale) }
  })()
  __preloadPromises.set(locale, p)
  return p
}

globalThis[Symbol.for('${primitives.runtimeKey}')] = { __switchLocale, __preloadLocale }

export { __catalog, __switchLocale, __preloadLocale, __currentLocale, __loading, __loadedLocales }
`
    },
  }
}
