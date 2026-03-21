import { defineNuxtModule, addPlugin, addImports, addComponent, addRouteMiddleware, addServerHandler, createResolver } from '@nuxt/kit'
import type { FluentNuxtOptions } from './types'
import { resolveLocaleProperties, resolveDomainConfigs } from './types'
import { resolveLocaleCodes } from '@fluenti/core'
import type { FluentiConfig } from '@fluenti/core'
import { extendPages } from './runtime/page-extend'
import { validateISRConfig } from './isr-validation'
import { setupDevTools } from './devtools'
import { createPageMetaTransform } from './page-meta-transform'

export type { FluentNuxtOptions, Strategy, FluentNuxtRuntimeConfig, DetectBrowserLanguageOptions, LocaleDetectContext, LocaleDetectorFn, BuiltinDetector, ISROptions, LocaleObject, LocaleDefinition, DomainConfig, I18nRouteConfig, I18nError, I18nErrorCode, I18nErrorHandler, MessageFallbackHandler } from './types'
export { generateSitemapUrls, createSitemapHook } from './sitemap'
export type { SitemapUrl } from './sitemap'
export { resolveLocaleProperties, resolveDomainConfigs } from './types'
export { resolveLocaleCodes } from '@fluenti/core'
export { localePath, extractLocaleFromPath, switchLocalePath } from './runtime/path-utils'
export { extendPages } from './runtime/page-extend'
export type { PageRoute, RouteNameTemplate, ExtendPagesOptions } from './runtime/page-extend'
export { buildLocaleHead } from './runtime/locale-head'
export type { LocaleHeadMeta, LocaleHeadOptions } from './runtime/locale-head'
export { useLocalePath, useSwitchLocalePath, useLocaleRoute, useLocaleHead } from './runtime/standalone-composables'
export { defineI18nRoute } from './runtime/define-i18n-route'

export const MODULE_NAME = '@fluenti/nuxt'
export const CONFIG_KEY = 'fluenti'

/**
 * Resolve the FluentiConfig from the module options.
 */
function resolveFluentiConfig(configOption: string | FluentiConfig | undefined, rootDir: string): FluentiConfig {
  if (typeof configOption === 'object') {
    // Inline config — merge with defaults
    try {
      const { DEFAULT_FLUENTI_CONFIG } = require('@fluenti/core/config') as {
        DEFAULT_FLUENTI_CONFIG: FluentiConfig
      }
      return { ...DEFAULT_FLUENTI_CONFIG, ...configOption }
    } catch {
      return configOption as FluentiConfig
    }
  }

  // string → specified path; undefined → auto-discover
  try {
    const { loadConfigSync } = require('@fluenti/core/config') as {
      loadConfigSync: (configPath?: string, cwd?: string) => FluentiConfig
    }
    return loadConfigSync(
      typeof configOption === 'string' ? configOption : undefined,
      rootDir,
    )
  } catch {
    // @fluenti/core not available — return minimal defaults
    return {
      sourceLocale: 'en',
      locales: ['en'],
      catalogDir: './locales',
      format: 'po',
      include: ['./src/**/*.{vue,tsx,jsx,ts,js}'],
      compileOutDir: './src/locales/compiled',
    }
  }
}

export default defineNuxtModule<FluentNuxtOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: CONFIG_KEY,
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: {
    strategy: 'prefix_except_default',
  },
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // --- Resolve FluentiConfig from options.config ---
    const rootDir = nuxt.options.rootDir ?? process.cwd()
    const fluentiConfig = resolveFluentiConfig(options.config, rootDir)

    // --- Resolve locale codes and metadata ---
    const localeCodes = resolveLocaleCodes(fluentiConfig.locales)
    const localeProperties = resolveLocaleProperties(fluentiConfig.locales)
    const defaultLocale = fluentiConfig.defaultLocale ?? fluentiConfig.sourceLocale
    const domainConfigs = options.strategy === 'domains'
      ? resolveDomainConfigs(fluentiConfig.locales, options.domains)
      : undefined

    // --- Inject runtime config ---
    const detectOrder = options.detectOrder ?? (
      options.strategy === 'domains'
        ? ['domain', 'cookie', 'header']
        : ['path', 'cookie', 'header']
    )
    nuxt.options.runtimeConfig.public['fluenti'] = {
      locales: localeCodes,
      defaultLocale,
      strategy: options.strategy ?? 'prefix_except_default',
      detectBrowserLanguage: options.detectBrowserLanguage,
      detectOrder,
      queryParamKey: options.queryParamKey ?? 'locale',
      injectGlobalProperties: options.injectGlobalProperties !== false,
      ...(domainConfigs ? { domains: domainConfigs } : {}),
      localeProperties,
    }

    // --- Auto-register @fluenti/vue vite plugin (includes v-t transform + scope transform) ---
    if (options.autoVitePlugin !== false) {
      // Pass the resolved fluentiConfig directly to the vite plugin
      const pluginOptions = {
        config: fluentiConfig,
      }
      // Synchronously load @fluenti/vue/vite-plugin using createRequire
      // (resolves from the user's project root, not from the nuxt module's node_modules)
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createRequire } = require('node:module') as typeof import('node:module')
        const projectRequire = createRequire(nuxt.options.rootDir + '/package.json')
        const vuePluginPath = projectRequire.resolve('@fluenti/vue/vite-plugin')
        const jitiMod = projectRequire('jiti') as { createJiti: (url: string, opts?: Record<string, unknown>) => (path: string) => unknown }
        const jiti = jitiMod.createJiti(vuePluginPath, { interopDefault: true })
        const fluentiVue = jiti(vuePluginPath) as Function
        nuxt.options.vite = nuxt.options.vite || {}
        nuxt.options.vite.plugins = nuxt.options.vite.plugins || []
        ;(nuxt.options.vite.plugins as unknown[]).push(
          ...fluentiVue(pluginOptions),
        )
      } catch {
        // @fluenti/vue or jiti not available — v-t and scope transforms won't run
      }
    }

    // --- Register definePageMeta({ i18n }) transform ---
    nuxt.options.vite = nuxt.options.vite || {}
    nuxt.options.vite.plugins = nuxt.options.vite.plugins || []
    ;(nuxt.options.vite.plugins as unknown[]).push(createPageMetaTransform())

    // --- Register runtime plugin ---
    addPlugin({
      src: resolve('./runtime/plugin'),
      mode: 'all',
    })

    // --- Extend routes with locale prefixes ---
    const strategy = options.strategy ?? 'prefix_except_default'
    if (strategy !== 'no_prefix' && strategy !== 'domains' && options.extendRoutes !== false) {
      nuxt.hook('pages:extend', (pages) => {
        extendPages(pages, {
          locales: localeCodes,
          defaultLocale,
          strategy,
          ...(options.routeNameTemplate ? { routeNameTemplate: options.routeNameTemplate } : {}),
          ...(options.routeOverrides ? { routeOverrides: options.routeOverrides } : {}),
          ...(options.routeMode ? { routeMode: options.routeMode } : {}),
        })
      })
    }

    // --- Register locale redirect middleware ---
    if (strategy === 'prefix') {
      addRouteMiddleware({
        name: 'fluenti-locale-redirect',
        path: resolve('./runtime/middleware/locale-redirect'),
        global: options.globalMiddleware !== false,
      })
    }

    // --- Auto-import composables ---
    if (options.autoImports !== false) {
      addImports([
        { name: 'useLocalePath', from: resolve('./runtime/composables') },
        { name: 'useSwitchLocalePath', from: resolve('./runtime/composables') },
        { name: 'useLocaleRoute', from: resolve('./runtime/composables') },
        { name: 'useLocaleHead', from: resolve('./runtime/composables') },
        { name: 'useI18nScoped', from: resolve('./runtime/composables') },
        { name: 'useI18n', from: '@fluenti/vue' },
        { name: 'defineI18nRoute', from: resolve('./runtime/define-i18n-route') },
      ])
    }

    // --- Register components (including DateTime + NumberFormat) ---
    const prefix = options.componentPrefix ?? ''
    if (options.registerNuxtLinkLocale !== false) {
      addComponent({
        name: `${prefix}NuxtLinkLocale`,
        filePath: resolve('./runtime/components/NuxtLinkLocale'),
      })
    }

    // Auto-import DateTime and NumberFormat from @fluenti/vue
    addComponent({ name: `${prefix}Trans`, filePath: '@fluenti/vue', export: 'Trans' })
    addComponent({ name: `${prefix}Plural`, filePath: '@fluenti/vue', export: 'Plural' })
    addComponent({ name: `${prefix}Select`, filePath: '@fluenti/vue', export: 'Select' })
    addComponent({ name: `${prefix}DateTime`, filePath: '@fluenti/vue', export: 'DateTime' })
    addComponent({ name: `${prefix}NumberFormat`, filePath: '@fluenti/vue', export: 'NumberFormat' })

    // --- SSG / ISR: configure nitro prerender and route rules ---
    if (strategy !== 'no_prefix' && strategy !== 'domains') {
      const nuxtOpts = nuxt.options as unknown as Record<string, unknown>

      // Enable link crawling so locale-prefixed routes are discovered during prerender
      const nitroOpts = (nuxtOpts['nitro'] ?? (nuxtOpts['nitro'] = {})) as Record<string, unknown>
      const prerender = (nitroOpts['prerender'] ?? (nitroOpts['prerender'] = {})) as Record<string, unknown>
      prerender['crawlLinks'] = prerender['crawlLinks'] ?? true

      // For 'prefix' strategy, / has no matching route (all routes are
      // locale-prefixed). Replace the default / initial route with
      // /<defaultLocale> so the prerenderer starts from a valid route.
      if (strategy === 'prefix') {
        const routes = (prerender['routes'] ?? ['/']) as string[]
        prerender['routes'] = routes.map((r) =>
          r === '/' ? `/${defaultLocale}` : r,
        )
      }

      // ISR: validate configuration and generate routeRules
      for (const w of validateISRConfig(options.isr, strategy, detectOrder)) {
        console.warn(w.message)
      }
      if (options.isr?.enabled) {
        const routeRules = (nuxtOpts['routeRules'] ?? (nuxtOpts['routeRules'] = {})) as Record<string, Record<string, unknown>>
        const ttl = options.isr.ttl ?? 3600
        for (const locale of localeCodes) {
          if (locale === defaultLocale && strategy === 'prefix_except_default') {
            routeRules['/**'] = { ...routeRules['/**'], isr: ttl }
          } else {
            routeRules[`/${locale}/**`] = { ...routeRules[`/${locale}/**`], isr: ttl }
          }
        }
      }
    }

    // --- Nuxt DevTools integration ---
    if (nuxt.options.dev) {
      setupDevTools(nuxt, localeCodes, defaultLocale, strategy)
    }

    // --- Nitro server handler for locale redirect (T2-10) ---
    if (strategy === 'prefix' || strategy === 'prefix_and_default') {
      addServerHandler({
        handler: resolve('./runtime/server/locale-redirect'),
        middleware: true,
      })
    }
  },
})
