/**
 * Simulates a third-party plugin that also injects $t and $localePath
 * onto globalProperties. With injectGlobalProperties: false, Fluenti
 * should NOT overwrite these.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.globalProperties.$t = (key: string) => `[third-party] ${key}`
  nuxtApp.vueApp.config.globalProperties.$localePath = (path: string) => `/third-party${path}`
})
