export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  modules: ['@fluenti/nuxt'],

  fluenti: {
    locales: ['en', 'ja', 'zh'],
    defaultLocale: 'en',
    strategy: 'prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'fluenti_locale',
      fallbackLocale: 'ja',
    },
    detectOrder: ['query', 'path', 'cookie', 'header'],
    autoVitePlugin: false,
  },
})
