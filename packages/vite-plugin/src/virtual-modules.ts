/**
 * Virtual module resolution for code-splitting mode.
 *
 * Provides:
 * - virtual:fluenti/runtime    → reactive catalog + switchLocale + preloadLocale
 * - virtual:fluenti/messages   → re-export from static locale (for static strategy)
 * - virtual:fluenti/catalog    → dev-mode single-object catalog (existing behavior)
 */

import { resolve } from 'node:path'

const VIRTUAL_RUNTIME = 'virtual:fluenti/runtime'
const VIRTUAL_MESSAGES = 'virtual:fluenti/messages'
const VIRTUAL_ROUTE_RUNTIME = 'virtual:fluenti/route-runtime'
const RESOLVED_RUNTIME = '\0virtual:fluenti/runtime'
const RESOLVED_MESSAGES = '\0virtual:fluenti/messages'
const RESOLVED_ROUTE_RUNTIME = '\0virtual:fluenti/route-runtime'

export interface VirtualModuleOptions {
  catalogDir: string
  locales: string[]
  sourceLocale: string
  defaultBuildLocale: string
  framework: 'vue' | 'solid'
}

export function resolveVirtualSplitId(id: string): string | undefined {
  if (id === VIRTUAL_RUNTIME) return RESOLVED_RUNTIME
  if (id === VIRTUAL_MESSAGES) return RESOLVED_MESSAGES
  if (id === VIRTUAL_ROUTE_RUNTIME) return RESOLVED_ROUTE_RUNTIME
  return undefined
}

export function loadVirtualSplitModule(
  id: string,
  options: VirtualModuleOptions,
): string | undefined {
  if (id === RESOLVED_RUNTIME) {
    return generateRuntimeModule(options)
  }
  if (id === RESOLVED_MESSAGES) {
    return generateStaticMessagesModule(options)
  }
  if (id === RESOLVED_ROUTE_RUNTIME) {
    return generateRouteRuntimeModule(options)
  }
  return undefined
}

function generateRuntimeModule(options: VirtualModuleOptions): string {
  const { catalogDir, locales, sourceLocale, defaultBuildLocale, framework } = options
  const defaultLocale = defaultBuildLocale || sourceLocale
  const absoluteCatalogDir = resolve(process.cwd(), catalogDir)

  if (framework === 'vue') {
    return `
import { shallowReactive, triggerRef, ref } from 'vue'
import * as __defaultMsgs from '${absoluteCatalogDir}/${defaultLocale}.js'

const __catalog = shallowReactive({ ...__defaultMsgs })
const __currentLocale = ref('${defaultLocale}')
const __loadedLocales = new Set(['${defaultLocale}'])
const __loading = ref(false)
const __cache = new Map()

const __loaders = {
${locales.map((l) => `  '${l}': () => import('${absoluteCatalogDir}/${l}.js'),`).join('\n')}
}

async function __switchLocale(locale) {
  if (__loadedLocales.has(locale)) {
    Object.assign(__catalog, __cache.get(locale) || __defaultMsgs)
    __currentLocale.value = locale
    return
  }
  __loading.value = true
  try {
    const mod = await __loaders[locale]()
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
    const mod = await __loaders[locale]()
    __cache.set(locale, mod)
    __loadedLocales.add(locale)
  } catch {}
}

export { __catalog, __switchLocale, __preloadLocale, __currentLocale, __loading, __loadedLocales }
`
  }

  // Solid
  return `
import { createSignal } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import * as __defaultMsgs from '${absoluteCatalogDir}/${defaultLocale}.js'

const [__catalog, __setCatalog] = createStore({ ...__defaultMsgs })
const [__currentLocale, __setCurrentLocale] = createSignal('${defaultLocale}')
const __loadedLocales = new Set(['${defaultLocale}'])
const [__loading, __setLoading] = createSignal(false)
const __cache = new Map()

const __loaders = {
${locales.map((l) => `  '${l}': () => import('${absoluteCatalogDir}/${l}.js'),`).join('\n')}
}

async function __switchLocale(locale) {
  if (__loadedLocales.has(locale)) {
    __setCatalog(reconcile(__cache.get(locale) || __defaultMsgs))
    __setCurrentLocale(locale)
    return
  }
  __setLoading(true)
  try {
    const mod = await __loaders[locale]()
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
    const mod = await __loaders[locale]()
    __cache.set(locale, mod)
    __loadedLocales.add(locale)
  } catch {}
}

export { __catalog, __switchLocale, __preloadLocale, __currentLocale, __loading, __loadedLocales }
`
}

function generateStaticMessagesModule(options: VirtualModuleOptions): string {
  const { catalogDir, defaultBuildLocale, sourceLocale } = options
  const defaultLocale = defaultBuildLocale || sourceLocale
  const absoluteCatalogDir = resolve(process.cwd(), catalogDir)

  return `export * from '${absoluteCatalogDir}/${defaultLocale}.js'\n`
}

/**
 * Generate the route runtime module for per-route splitting.
 *
 * At transform time, this module serves as the import target for `__catalog`.
 * It imports ALL messages from the default locale (same as 'dynamic') so the
 * build completes. The actual per-route chunk partitioning happens in
 * `generateBundle` which emits smaller chunk files and rewrites imports.
 *
 * At runtime, the module provides:
 * - `__catalog`: reactive object holding current locale messages
 * - `__switchLocale(locale)`: loads all route chunks for the new locale
 * - `__loadRoute(routeId, locale)`: loads a single route chunk
 * - `__currentLocale`, `__loading`, `__loadedLocales`: state refs
 */
export function generateRouteRuntimeModule(options: VirtualModuleOptions): string {
  const { catalogDir, locales, sourceLocale, defaultBuildLocale, framework } = options
  const defaultLocale = defaultBuildLocale || sourceLocale
  const absoluteCatalogDir = resolve(process.cwd(), catalogDir)

  if (framework === 'vue') {
    return `
import { shallowReactive, ref } from 'vue'
import * as __defaultMsgs from '${absoluteCatalogDir}/${defaultLocale}.js'

const __catalog = shallowReactive({ ...__defaultMsgs })
const __currentLocale = ref('${defaultLocale}')
const __loadedLocales = new Set(['${defaultLocale}'])
const __loading = ref(false)
const __cache = new Map()
const __loadedRoutes = new Set()

const __loaders = {
${locales.map((l) => `  '${l}': () => import('${absoluteCatalogDir}/${l}.js'),`).join('\n')}
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
  const mod = await loader()
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
      const mod = await __loaders[locale]()
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
    const mod = await __loaders[locale]()
    __cache.set(locale, mod)
    __loadedLocales.add(locale)
  } catch {}
}

export { __catalog, __switchLocale, __preloadLocale, __loadRoute, __registerRouteLoader, __currentLocale, __loading, __loadedLocales }
`
  }

  // Solid
  return `
import { createSignal } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import * as __defaultMsgs from '${absoluteCatalogDir}/${defaultLocale}.js'

const [__catalog, __setCatalog] = createStore({ ...__defaultMsgs })
const [__currentLocale, __setCurrentLocale] = createSignal('${defaultLocale}')
const __loadedLocales = new Set(['${defaultLocale}'])
const [__loading, __setLoading] = createSignal(false)
const __cache = new Map()
const __loadedRoutes = new Set()

const __loaders = {
${locales.map((l) => `  '${l}': () => import('${absoluteCatalogDir}/${l}.js'),`).join('\n')}
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
  const mod = await loader()
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
      const mod = await __loaders[locale]()
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
    const mod = await __loaders[locale]()
    __cache.set(locale, mod)
    __loadedLocales.add(locale)
  } catch {}
}

export { __catalog, __switchLocale, __preloadLocale, __loadRoute, __registerRouteLoader, __currentLocale, __loading, __loadedLocales }
`
}
