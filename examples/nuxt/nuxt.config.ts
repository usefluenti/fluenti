import fluentiVue from '@fluenti/vue/vite-plugin'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  vite: {
    plugins: [
      fluentiVue({
        sourceLocale: 'en',
        locales: ['en', 'ja'],
        catalogDir: 'locales/compiled',
      }),
    ],
  },

  // No external i18n modules — Fluenti handles everything
  modules: [],
})
