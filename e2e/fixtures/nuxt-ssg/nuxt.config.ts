export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  modules: ['@fluenti/nuxt'],

  fluenti: {
    locales: ['en', 'ja', 'zh'],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'fluenti_locale',
    },
    autoVitePlugin: false, // We provide messages manually for simplicity
  },

  // SSG mode
  nitro: {
    preset: 'static',
  },
})
