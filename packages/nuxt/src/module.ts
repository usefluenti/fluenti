import { defineNuxtModule, addPlugin, addImports, addComponent, addRouteMiddleware, createResolver } from '@nuxt/kit'
import type { FluentNuxtOptions } from './types'
import { extendPages } from './runtime/page-extend'

export type { FluentNuxtOptions, Strategy, FluentNuxtRuntimeConfig, DetectBrowserLanguageOptions, LocaleDetectContext, LocaleDetectorFn, BuiltinDetector } from './types'
export { localePath, extractLocaleFromPath, switchLocalePath } from './runtime/path-utils'
export { extendPages } from './runtime/page-extend'
export type { PageRoute } from './runtime/page-extend'
export { buildLocaleHead } from './runtime/locale-head'
export type { LocaleHeadMeta, LocaleHeadOptions } from './runtime/locale-head'

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
    ])

    // --- Register NuxtLinkLocale component ---
    addComponent({
      name: 'NuxtLinkLocale',
      filePath: resolve('./runtime/components/NuxtLinkLocale'),
    })
  },
})
