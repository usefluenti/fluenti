import { resolve } from 'node:path'
import type { RuntimeGenerator, RuntimeGeneratorOptions } from '@fluenti/vite-plugin'

export const solidRuntimeGenerator: RuntimeGenerator = {
  generateRuntime(options: RuntimeGeneratorOptions): string {
    const { catalogDir, locales, sourceLocale, defaultBuildLocale } = options
    const defaultLocale = defaultBuildLocale || sourceLocale
    const absoluteCatalogDir = resolve(process.cwd(), catalogDir)
    const runtimeKey = 'fluenti.runtime.solid'
    const lazyLocales = locales.filter((locale) => locale !== defaultLocale)

    return `
import { createSignal } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import __defaultMsgs from '${absoluteCatalogDir}/${defaultLocale}.js'

const [__catalog, __setCatalog] = createStore({ ...__defaultMsgs })
const [__currentLocale, __setCurrentLocale] = createSignal('${defaultLocale}')
const __loadedLocales = new Set(['${defaultLocale}'])
const [__loading, __setLoading] = createSignal(false)
const __cache = new Map()
const __normalizeMessages = (mod) => mod.default ?? mod

const __loaders = {
${lazyLocales.map((l) => `  '${l}': () => import('${absoluteCatalogDir}/${l}.js'),`).join('\n')}
}

async function __switchLocale(locale) {
  if (__loadedLocales.has(locale)) {
    __setCatalog(reconcile(__cache.get(locale) || __defaultMsgs))
    __setCurrentLocale(locale)
    return
  }
  __setLoading(true)
  try {
    const mod = __normalizeMessages(await __loaders[locale]())
    __cache.set(locale, mod)
    __loadedLocales.add(locale)
    __setCatalog(reconcile(mod))
    __setCurrentLocale(locale)
  } finally {
    __setLoading(false)
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

globalThis[Symbol.for('${runtimeKey}')] = { __switchLocale, __preloadLocale }

export { __catalog, __switchLocale, __preloadLocale, __currentLocale, __loading, __loadedLocales }
`
  },

  generateRouteRuntime(options: RuntimeGeneratorOptions): string {
    const { catalogDir, locales, sourceLocale, defaultBuildLocale } = options
    const defaultLocale = defaultBuildLocale || sourceLocale
    const absoluteCatalogDir = resolve(process.cwd(), catalogDir)
    const runtimeKey = 'fluenti.runtime.solid'
    const lazyLocales = locales.filter((locale) => locale !== defaultLocale)

    return `
import { createSignal } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import __defaultMsgs from '${absoluteCatalogDir}/${defaultLocale}.js'

const [__catalog, __setCatalog] = createStore({ ...__defaultMsgs })
const [__currentLocale, __setCurrentLocale] = createSignal('${defaultLocale}')
const __loadedLocales = new Set(['${defaultLocale}'])
const [__loading, __setLoading] = createSignal(false)
const __cache = new Map()
const __loadedRoutes = new Set()
const __normalizeMessages = (mod) => mod.default ?? mod

const __loaders = {
${lazyLocales.map((l) => `  '${l}': () => import('${absoluteCatalogDir}/${l}.js'),`).join('\n')}
}

const __routeLoaders = {}

function __registerRouteLoader(routeId, locale, loader) {
  const key = routeId + ':' + locale
  __routeLoaders[key] = loader
}

async function __loadRoute(routeId, locale) {
  const key = routeId + ':' + (locale || __currentLocale())
  if (__loadedRoutes.has(key)) return
  const loader = __routeLoaders[key]
  if (!loader) return
  const mod = __normalizeMessages(await loader())
  __setCatalog(reconcile({ ...__catalog, ...mod }))
  __loadedRoutes.add(key)
}

async function __switchLocale(locale) {
  if (locale === __currentLocale()) return
  __setLoading(true)
  try {
    if (__cache.has(locale)) {
      __setCatalog(reconcile(__cache.get(locale)))
    } else {
      const mod = __normalizeMessages(await __loaders[locale]())
      __cache.set(locale, mod)
      __setCatalog(reconcile(mod))
    }
    __loadedLocales.add(locale)
    __setCurrentLocale(locale)
  } finally {
    __setLoading(false)
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

globalThis[Symbol.for('${runtimeKey}')] = { __switchLocale, __preloadLocale }

export { __catalog, __switchLocale, __preloadLocale, __loadRoute, __registerRouteLoader, __currentLocale, __loading, __loadedLocales }
`
  },
}
