import { createApp } from 'vue'
import { createFluentVue } from '@fluenti/vue'
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
app.use(createFluentVue({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en },
  lazyLocaleLoading: true,
  chunkLoader: loadLocaleMessages,
}))
app.use(router)
app.mount('#app')
