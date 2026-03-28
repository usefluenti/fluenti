import { createApp } from 'vue'
import { createFluenti } from '@fluenti/vue'
import { interpolate } from '@fluenti/vue/components'
import App from './App.vue'
import router from './router'
import en from './locales/compiled/en.js'

function loadLocaleMessages(locale: string) {
  if (locale === 'en') {
    return Promise.resolve(en)
  }
  if (locale === 'ja') {
    return import('./locales/compiled/ja.js')
  }
  return Promise.reject(new Error(`Unsupported locale: ${locale}`))
}

const app = createApp(App)
app.use(createFluenti({
  locale: 'en',
  fallbackLocale: 'en',
  interpolate,
  messages: { en },
  lazyLocaleLoading: true,
  chunkLoader: loadLocaleMessages,
}))
app.use(router)
app.mount('#app')
