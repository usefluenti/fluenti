/**
 * Virtual module resolution for code-splitting mode.
 *
 * Provides:
 * - virtual:fluenti/runtime    → reactive catalog + switchLocale + preloadLocale
 * - virtual:fluenti/messages   → re-export from static locale (for static strategy)
 * - virtual:fluenti/route-runtime → per-route splitting runtime
 */

import { resolve } from 'node:path'
import { validateLocale } from '@fluenti/core'
import type { RuntimeGenerator, RuntimeGeneratorOptions } from './types'

/**
 * Escapes a string value for safe embedding in generated JavaScript code.
 * Returns a JSON-encoded string (with double quotes), preventing injection
 * of quotes, backticks, template interpolation, and other special characters.
 */
function safeStringLiteral(value: string): string {
  return JSON.stringify(value)
}

/**
 * Validates that a catalog directory path does not contain characters
 * that could enable code injection in generated template literals.
 */
function validateCatalogDir(catalogDir: string): void {
  if (catalogDir.includes('`') || catalogDir.includes('$')) {
    throw new Error(
      `[fluenti] vite-plugin: catalogDir must not contain backticks or $ characters, got ${JSON.stringify(catalogDir)}`,
    )
  }
}

const VIRTUAL_RUNTIME = 'virtual:fluenti/runtime'
const VIRTUAL_MESSAGES = 'virtual:fluenti/messages'
const VIRTUAL_ROUTE_RUNTIME = 'virtual:fluenti/route-runtime'
const RESOLVED_RUNTIME = '\0virtual:fluenti/runtime'
const RESOLVED_MESSAGES = '\0virtual:fluenti/messages'
const RESOLVED_ROUTE_RUNTIME = '\0virtual:fluenti/route-runtime'

export interface VirtualModuleOptions {
  rootDir: string
  catalogDir: string
  catalogExtension: string
  locales: string[]
  sourceLocale: string
  defaultBuildLocale: string
  framework: string
  runtimeGenerator?: RuntimeGenerator | undefined
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
  const { locales, runtimeGenerator, catalogDir } = options
  validateCatalogDir(catalogDir)
  for (const locale of locales) {
    validateLocale(locale, 'vite-plugin')
  }

  if (runtimeGenerator) {
    return runtimeGenerator.generateRuntime(toRuntimeGeneratorOptions(options))
  }

  // Legacy fallback: inline generation for backward compat
  return generateLegacyRuntimeModule(options)
}

function generateStaticMessagesModule(options: VirtualModuleOptions): string {
  const { rootDir, catalogDir, catalogExtension, defaultBuildLocale, sourceLocale } = options
  const defaultLocale = defaultBuildLocale || sourceLocale
  validateLocale(defaultLocale, 'vite-plugin')
  validateCatalogDir(catalogDir)
  const absoluteCatalogDir = resolve(rootDir, catalogDir)

  return `export * from ${safeStringLiteral(absoluteCatalogDir + '/' + defaultLocale + catalogExtension)}\n`
}

/**
 * Generate the route runtime module for per-route splitting.
 */
export function generateRouteRuntimeModule(options: VirtualModuleOptions): string {
  const { locales, runtimeGenerator, catalogDir } = options
  validateCatalogDir(catalogDir)
  for (const locale of locales) {
    validateLocale(locale, 'vite-plugin')
  }

  if (runtimeGenerator) {
    return runtimeGenerator.generateRouteRuntime(toRuntimeGeneratorOptions(options))
  }

  // Legacy fallback
  return generateLegacyRouteRuntimeModule(options)
}

function toRuntimeGeneratorOptions(options: VirtualModuleOptions): RuntimeGeneratorOptions {
  const { rootDir, catalogDir, catalogExtension, locales, sourceLocale, defaultBuildLocale } = options
  return { rootDir, catalogDir, catalogExtension, locales, sourceLocale, defaultBuildLocale }
}

// ─── Legacy inline runtime generators (used when no RuntimeGenerator is provided) ──

function generateLegacyRuntimeModule(options: VirtualModuleOptions): string {
  const { rootDir, catalogDir, catalogExtension, locales, sourceLocale, defaultBuildLocale, framework } = options
  const defaultLocale = defaultBuildLocale || sourceLocale
  const absoluteCatalogDir = resolve(rootDir, catalogDir)
  const runtimeKey = `fluenti.runtime.${framework}.v1`
  const lazyLocales = locales.filter((locale) => locale !== defaultLocale)

  const defaultImportPath = safeStringLiteral(absoluteCatalogDir + '/' + defaultLocale + catalogExtension)
  const safeDefaultLocale = safeStringLiteral(defaultLocale)
  const safeRuntimeKey = safeStringLiteral(runtimeKey)
  const loadersBlock = lazyLocales
    .map((l) => `  ${safeStringLiteral(l)}: () => import(${safeStringLiteral(absoluteCatalogDir + '/' + l + catalogExtension)}),`)
    .join('\n')

  if (framework === 'react') {
    return `
import __defaultMsgs from ${defaultImportPath}

const __catalog = { ...__defaultMsgs }
let __currentLocale = ${safeDefaultLocale}
const __loadedLocales = new Set([${safeDefaultLocale}])
let __loading = false
const __cache = new Map()
const __normalizeMessages = (mod) => mod.default ?? mod

const __loaders = {
${loadersBlock}
}

async function __switchLocale(locale) {
  if (__loadedLocales.has(locale)) {
    Object.assign(__catalog, __cache.get(locale) || __defaultMsgs)
    __currentLocale = locale
    return
  }
  __loading = true
  try {
    const mod = __normalizeMessages(await __loaders[locale]())
    __cache.set(locale, mod)
    __loadedLocales.add(locale)
    Object.assign(__catalog, mod)
    __currentLocale = locale
  } finally {
    __loading = false
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

globalThis[Symbol.for(${safeRuntimeKey})] = { __switchLocale, __preloadLocale }

export { __catalog, __switchLocale, __preloadLocale, __currentLocale, __loading, __loadedLocales }
`
  }

  if (framework === 'vue') {
    return `
import { shallowReactive, triggerRef, ref } from 'vue'
import __defaultMsgs from ${defaultImportPath}

const __catalog = shallowReactive({ ...__defaultMsgs })
const __currentLocale = ref(${safeDefaultLocale})
const __loadedLocales = new Set([${safeDefaultLocale}])
const __loading = ref(false)
const __cache = new Map()
const __normalizeMessages = (mod) => mod.default ?? mod

const __loaders = {
${loadersBlock}
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

globalThis[Symbol.for(${safeRuntimeKey})] = { __switchLocale, __preloadLocale }

export { __catalog, __switchLocale, __preloadLocale, __currentLocale, __loading, __loadedLocales }
`
  }

  // Solid
  return `
import { createSignal } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import __defaultMsgs from ${defaultImportPath}

const [__catalog, __setCatalog] = createStore({ ...__defaultMsgs })
const [__currentLocale, __setCurrentLocale] = createSignal(${safeDefaultLocale})
const __loadedLocales = new Set([${safeDefaultLocale}])
const [__loading, __setLoading] = createSignal(false)
const __cache = new Map()
const __normalizeMessages = (mod) => mod.default ?? mod

const __loaders = {
${loadersBlock}
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

globalThis[Symbol.for(${safeRuntimeKey})] = { __switchLocale, __preloadLocale }

export { __catalog, __switchLocale, __preloadLocale, __currentLocale, __loading, __loadedLocales }
`
}

function generateLegacyRouteRuntimeModule(options: VirtualModuleOptions): string {
  const { rootDir, catalogDir, catalogExtension, locales, sourceLocale, defaultBuildLocale, framework } = options
  const defaultLocale = defaultBuildLocale || sourceLocale
  const absoluteCatalogDir = resolve(rootDir, catalogDir)
  const runtimeKey = `fluenti.runtime.${framework}.v1`
  const lazyLocales = locales.filter((locale) => locale !== defaultLocale)

  const defaultImportPath = safeStringLiteral(absoluteCatalogDir + '/' + defaultLocale + catalogExtension)
  const safeDefaultLocale = safeStringLiteral(defaultLocale)
  const safeRuntimeKey = safeStringLiteral(runtimeKey)
  const loadersBlock = lazyLocales
    .map((l) => `  ${safeStringLiteral(l)}: () => import(${safeStringLiteral(absoluteCatalogDir + '/' + l + catalogExtension)}),`)
    .join('\n')

  if (framework === 'vue') {
    return `
import { shallowReactive, ref } from 'vue'
import __defaultMsgs from ${defaultImportPath}

const __catalog = shallowReactive({ ...__defaultMsgs })
const __currentLocale = ref(${safeDefaultLocale})
const __loadedLocales = new Set([${safeDefaultLocale}])
const __loading = ref(false)
const __cache = new Map()
const __loadedRoutes = new Set()
const __normalizeMessages = (mod) => mod.default ?? mod

const __loaders = {
${loadersBlock}
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

globalThis[Symbol.for(${safeRuntimeKey})] = { __switchLocale, __preloadLocale }

export { __catalog, __switchLocale, __preloadLocale, __loadRoute, __registerRouteLoader, __currentLocale, __loading, __loadedLocales }
`
  }

  // Solid
  return `
import { createSignal } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import __defaultMsgs from ${defaultImportPath}

const [__catalog, __setCatalog] = createStore({ ...__defaultMsgs })
const [__currentLocale, __setCurrentLocale] = createSignal(${safeDefaultLocale})
const __loadedLocales = new Set([${safeDefaultLocale}])
const [__loading, __setLoading] = createSignal(false)
const __cache = new Map()
const __loadedRoutes = new Set()
const __normalizeMessages = (mod) => mod.default ?? mod

const __loaders = {
${loadersBlock}
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

globalThis[Symbol.for(${safeRuntimeKey})] = { __switchLocale, __preloadLocale }

export { __catalog, __switchLocale, __preloadLocale, __loadRoute, __registerRouteLoader, __currentLocale, __loading, __loadedLocales }
`
}
