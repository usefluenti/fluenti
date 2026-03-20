export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  modules: ['@fluenti/nuxt'],

  fluenti: {
    locales: ['en', 'ja', 'zh'],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectOrder: ['path', 'cookie', 'header'],
    autoVitePlugin: false,
    isr: {
      enabled: true,
      ttl: 60,
    },
  },
})
