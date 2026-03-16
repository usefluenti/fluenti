import { createApp, ref, computed, type InjectionKey } from 'vue'
import { createFluentVue } from '@fluenti/vue'
import {
  useLocalePath,
  useSwitchLocalePath,
  useLocaleHead,
  extractLocaleFromPath,
} from '@fluenti/nuxt'
import type { FluentNuxtRuntimeConfig } from '@fluenti/nuxt'
import App from './App.vue'
import router from './router'
import { messages } from './locales/messages'

// Simulate Nuxt runtime config
const runtimeConfig: FluentNuxtRuntimeConfig = {
  locales: ['en', 'ja', 'zh'],
  defaultLocale: 'en',
  strategy: 'prefix_except_default',
}

export const RUNTIME_CONFIG_KEY: InjectionKey<FluentNuxtRuntimeConfig> = Symbol('runtimeConfig')

// Create fluenti plugin
const fluenti = createFluentVue({
  locale: 'en',
  fallbackLocale: 'en',
  messages,
})

const app = createApp(App)
app.use(router)
app.use(fluenti)
app.provide(RUNTIME_CONFIG_KEY, runtimeConfig)

// Auto-switch locale based on URL prefix
router.beforeEach((to) => {
  const { locale: pathLocale } = extractLocaleFromPath(to.path, runtimeConfig.locales)
  if (pathLocale && pathLocale !== fluenti.global.locale.value) {
    fluenti.global.setLocale(pathLocale)
  }
})

app.mount('#app')
