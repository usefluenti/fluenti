import { resolve } from 'node:path'
import type { RuntimeGenerator, RuntimeGeneratorOptions } from '@fluenti/vite-plugin'

export const vueRuntimeGenerator: RuntimeGenerator = {
  generateRuntime(options: RuntimeGeneratorOptions): string {
    const { catalogDir, catalogExtension, locales, sourceLocale, defaultBuildLocale } = options
    const defaultLocale = defaultBuildLocale || sourceLocale
    const absoluteCatalogDir = resolve(process.cwd(), catalogDir)
    const ext = catalogExtension || '.js'
    const runtimeKey = 'fluenti.runtime.vue.v1'
    const lazyLocales = locales.filter((locale) => locale !== defaultLocale)

    return `
import { shallowReactive, ref } from 'vue'
import __defaultMsgs from '${absoluteCatalogDir}/${defaultLocale}${ext}'

const __catalog = shallowReactive({ ...__defaultMsgs })
const __currentLocale = ref('${defaultLocale}')
const __loadedLocales = new Set(['${defaultLocale}'])
const __loading = ref(false)
const __cache = new Map()
const __normalizeMessages = (mod) => mod.default ?? mod

const __loaders = {
${lazyLocales.map((l) => `  '${l}': () => import('${absoluteCatalogDir}/${l}${ext}'),`).join('\n')}
}

async function __switchLocale(locale) {
  if (__loadedLocales.has(locale)) {
    Object.assign(__catalog, __cache.get(locale) || __defaultMsgs)
    __currentLocale.value = locale
    return
  }
  __loading.value = true
  try {
    const mod = __normalizeMessages(await __loaders[locale]())
    __cache.set(locale, mod)
    __loadedLocales.add(locale)
    Object.assign(__catalog, mod)
    __currentLocale.value = locale
  } finally {
    __loading.value = false
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
    const { catalogDir, catalogExtension, locales, sourceLocale, defaultBuildLocale } = options
    const defaultLocale = defaultBuildLocale || sourceLocale
    const absoluteCatalogDir = resolve(process.cwd(), catalogDir)
    const ext = catalogExtension || '.js'
    const runtimeKey = 'fluenti.runtime.vue.v1'
    const lazyLocales = locales.filter((locale) => locale !== defaultLocale)

    return `
import { shallowReactive, ref } from 'vue'
import __defaultMsgs from '${absoluteCatalogDir}/${defaultLocale}${ext}'

const __catalog = shallowReactive({ ...__defaultMsgs })
const __currentLocale = ref('${defaultLocale}')
const __loadedLocales = new Set(['${defaultLocale}'])
const __loading = ref(false)
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
  const key = routeId + ':' + (locale || __currentLocale.value)
  if (__loadedRoutes.has(key)) return
  const loader = __routeLoaders[key]
  if (!loader) return
  const mod = __normalizeMessages(await loader())
  Object.assign(__catalog, mod)
  __loadedRoutes.add(key)
}

async function __switchLocale(locale) {
  if (locale === __currentLocale.value) return
  __loading.value = true
  try {
    if (__cache.has(locale)) {
      Object.assign(__catalog, __cache.get(locale))
    } else {
      const mod = __normalizeMessages(await __loaders[locale]())
      __cache.set(locale, mod)
      Object.assign(__catalog, mod)
    }
    __loadedLocales.add(locale)
    __currentLocale.value = locale
  } finally {
    __loading.value = false
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
