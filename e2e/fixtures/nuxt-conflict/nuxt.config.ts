export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  modules: ['@fluenti/nuxt'],

  // Disable prerendering so SSR detection can run
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: [],
    },
  },

  fluenti: {
    locales: ['en', 'ja', 'zh'],
    defaultLocale: 'en',
    strategy: 'prefix',
    autoImports: false,
    injectGlobalProperties: false,
    queryParamKey: 'lang',
    globalMiddleware: false,
    registerNuxtLinkLocale: false,
    detectOrder: ['query', 'path', 'cookie', 'header'],
    autoVitePlugin: false,
  },
})
