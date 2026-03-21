export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  // Disable prerendering — locale detection requires live SSR
  routeRules: {
    '/**': { prerender: false },
  },

  modules: ['@fluenti/nuxt'],

  fluenti: {
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    sourceLocale: 'en',
    catalogDir: 'locales/compiled',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'fluenti_locale',
    },
  },
})
