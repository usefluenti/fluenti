export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  modules: ['./modules/custom-detect', '@fluenti/nuxt'],

  // Disable prerendering — all requests must go through SSR so the
  // fluenti:detect-locale hook can inspect per-request headers.
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: [],
    },
  },

  fluenti: {
    locales: ['en', 'ja', 'zh'],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    // Only use path detection — cookie and header disabled
    detectOrder: ['path'],
    autoVitePlugin: false,
  },
})
