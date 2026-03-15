export type { FluentNuxtOptions, Strategy, FluentNuxtRuntimeConfig, DetectBrowserLanguageOptions } from './types'
export { localePath, extractLocaleFromPath, switchLocalePath, extendPages } from './runtime/route-utils'
export { useLocalePath, useSwitchLocalePath } from './runtime/composables'
export { useLocaleHead } from './runtime/locale-head'
export { NuxtLinkLocale } from './runtime/components/NuxtLinkLocale'
export type { LocaleHeadMeta, LocaleHeadOptions } from './runtime/locale-head'
export type { PageRoute } from './runtime/route-utils'

/**
 * @fluenti/nuxt module definition.
 *
 * This module provides:
 * - Automatic Fluenti plugin registration (SSR-safe)
 * - Locale-prefixed route generation (4 strategies)
 * - Composables: useLocalePath, useSwitchLocalePath, useLocaleHead
 * - NuxtLinkLocale component
 * - Auto locale detection from cookie/path/headers
 *
 * @example
 * ```ts
 * // nuxt.config.ts
 * export default defineNuxtConfig({
 *   modules: ['@fluenti/nuxt'],
 *   fluenti: {
 *     locales: ['en', 'ja'],
 *     defaultLocale: 'en',
 *     strategy: 'prefix_except_default',
 *   },
 * })
 * ```
 *
 * NOTE: The actual Nuxt module registration (defineNuxtModule) requires
 * @nuxt/kit which is only available in Nuxt projects. This file provides
 * the configuration types and runtime utilities. The defineNuxtModule
 * integration should be set up by the consumer or via a Nuxt-specific
 * entry point.
 *
 * Example module setup (in a Nuxt project):
 * ```ts
 * import { defineNuxtModule, addPlugin, addImports, createResolver } from '@nuxt/kit'
 * import type { FluentNuxtOptions } from '@fluenti/nuxt'
 * import { extendPages } from '@fluenti/nuxt'
 *
 * export default defineNuxtModule<FluentNuxtOptions>({
 *   meta: { name: '@fluenti/nuxt', configKey: 'fluenti' },
 *   setup(options, nuxt) {
 *     const resolver = createResolver(import.meta.url)
 *
 *     // Inject runtime config
 *     nuxt.options.runtimeConfig.public.fluenti = {
 *       locales: options.locales,
 *       defaultLocale: options.defaultLocale,
 *       strategy: options.strategy ?? 'prefix_except_default',
 *     }
 *
 *     // Extend routes with locale prefixes
 *     if (options.strategy !== 'no_prefix') {
 *       nuxt.hook('pages:extend', (pages) => {
 *         extendPages(pages, {
 *           locales: options.locales,
 *           defaultLocale: options.defaultLocale,
 *           strategy: options.strategy ?? 'prefix_except_default',
 *         })
 *       })
 *     }
 *
 *     // Register auto-imports
 *     addImports([
 *       { name: 'useLocalePath', from: '@fluenti/nuxt/runtime' },
 *       { name: 'useSwitchLocalePath', from: '@fluenti/nuxt/runtime' },
 *       { name: 'useLocaleHead', from: '@fluenti/nuxt/runtime' },
 *     ])
 *   },
 * })
 * ```
 */
export const MODULE_NAME = '@fluenti/nuxt'
export const CONFIG_KEY = 'fluenti'
