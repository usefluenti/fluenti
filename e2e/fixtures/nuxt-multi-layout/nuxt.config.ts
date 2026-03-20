export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  modules: ['@fluenti/nuxt'],

  nitro: {
    prerender: {
      crawlLinks: false,
      routes: [],
    },
  },

  fluenti: {
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectOrder: ['path', 'cookie'],
    autoVitePlugin: false,
  },
})
