import { defineNuxtModule, addPlugin, addImports, addComponent, addRouteMiddleware, createResolver } from '@nuxt/kit'
import type { FluentNuxtOptions } from './types'
import { extendPages } from './runtime/page-extend'

export type { FluentNuxtOptions, Strategy, FluentNuxtRuntimeConfig, DetectBrowserLanguageOptions, LocaleDetectContext, LocaleDetectorFn, BuiltinDetector, ISROptions } from './types'
export { localePath, extractLocaleFromPath, switchLocalePath } from './runtime/path-utils'
export { extendPages } from './runtime/page-extend'
export type { PageRoute } from './runtime/page-extend'
export { buildLocaleHead } from './runtime/locale-head'
export type { LocaleHeadMeta, LocaleHeadOptions } from './runtime/locale-head'
export { useLocalePath, useSwitchLocalePath, useLocaleHead } from './runtime/composables'

export const MODULE_NAME = '@fluenti/nuxt'
export const CONFIG_KEY = 'fluenti'

export default defineNuxtModule<FluentNuxtOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: CONFIG_KEY,
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: {
    locales: [],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
  },
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // --- Inject runtime config ---
    const detectOrder = options.detectOrder ?? ['path', 'cookie', 'header']
    nuxt.options.runtimeConfig.public['fluenti'] = {
      locales: options.locales,
      defaultLocale: options.defaultLocale,
      strategy: options.strategy ?? 'prefix_except_default',
      detectBrowserLanguage: options.detectBrowserLanguage,
      detectOrder,
    }

    // --- Auto-register @fluenti/vite-plugin ---
    if (options.autoVitePlugin !== false) {
      try {
        const vitePlugin = require('@fluenti/vite-plugin')
        const plugin = vitePlugin.default ?? vitePlugin
        nuxt.options.vite = nuxt.options.vite || {}
        nuxt.options.vite.plugins = nuxt.options.vite.plugins || []
        ;(nuxt.options.vite.plugins as unknown[]).push(
          plugin({ framework: 'vue' }),
        )
      } catch {
        // @fluenti/vite-plugin is an optional peer dependency
      }
    }

    // --- Register runtime plugin ---
    addPlugin({
      src: resolve('./runtime/plugin'),
      mode: 'all',
    })

    // --- Extend routes with locale prefixes ---
    if (options.strategy !== 'no_prefix') {
      nuxt.hook('pages:extend', (pages) => {
        extendPages(pages, {
          locales: options.locales,
          defaultLocale: options.defaultLocale,
          strategy: options.strategy ?? 'prefix_except_default',
        })
      })
    }

    // --- Register locale redirect middleware ---
    if (options.strategy === 'prefix') {
      addRouteMiddleware({
        name: 'fluenti-locale-redirect',
        path: resolve('./runtime/middleware/locale-redirect'),
        global: true,
      })
    }

    // --- Auto-import composables ---
    addImports([
      { name: 'useLocalePath', from: resolve('./runtime/composables') },
      { name: 'useSwitchLocalePath', from: resolve('./runtime/composables') },
      { name: 'useLocaleHead', from: resolve('./runtime/composables') },
      { name: 'useI18n', from: '@fluenti/vue' },
    ])

    // --- Register NuxtLinkLocale component ---
    const prefix = options.componentPrefix ?? ''
    addComponent({
      name: `${prefix}NuxtLinkLocale`,
      filePath: resolve('./runtime/components/NuxtLinkLocale'),
    })

    // --- SSG / ISR: configure nitro prerender and route rules ---
    const strategy = options.strategy ?? 'prefix_except_default'
    if (strategy !== 'no_prefix') {
      const nuxtOpts = nuxt.options as unknown as Record<string, unknown>

      // Enable link crawling so locale-prefixed routes are discovered during prerender
      const nitroOpts = (nuxtOpts['nitro'] ?? (nuxtOpts['nitro'] = {})) as Record<string, unknown>
      const prerender = (nitroOpts['prerender'] ?? (nitroOpts['prerender'] = {})) as Record<string, unknown>
      prerender['crawlLinks'] = prerender['crawlLinks'] ?? true

      // ISR: generate routeRules for each locale pattern
      if (options.isr?.enabled) {
        const routeRules = (nuxtOpts['routeRules'] ?? (nuxtOpts['routeRules'] = {})) as Record<string, Record<string, unknown>>
        const ttl = options.isr.ttl ?? 3600
        for (const locale of options.locales) {
          if (locale === options.defaultLocale && strategy === 'prefix_except_default') {
            routeRules['/**'] = { ...routeRules['/**'], isr: ttl }
          } else {
            routeRules[`/${locale}/**`] = { ...routeRules[`/${locale}/**`], isr: ttl }
          }
        }
      }
    }
  },
})
