export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  // Disable prerendering — locale detection requires live SSR
  routeRules: {
    '/**': { prerender: false },
  },

  modules: ['@fluenti/nuxt'],

  fluenti: {
    locales: ['en', 'ja', 'ar'],
    defaultLocale: 'en',
    sourceLocale: 'en',
    // This demo relies on cookie-based locale detection rather than locale-prefixed URLs.
    strategy: 'no_prefix',
    catalogDir: 'locales/compiled',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'fluenti_locale',
    },
  },
})
