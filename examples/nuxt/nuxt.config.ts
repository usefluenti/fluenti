export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  modules: ['@fluenti/nuxt'],

  fluenti: {
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    sourceLocale: 'en',
    catalogDir: 'locales/compiled',
  },
})
