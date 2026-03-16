import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createFluentVue } from '@fluenti/vue'
import { createFluentBridge } from '@fluenti/vue-i18n-compat'
import App from './App.vue'
import { legacyMessages } from './locales/legacy'
import { fluentMessages } from './locales/fluenti'

// 1. Create vue-i18n instance (existing legacy translations)
const vueI18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: legacyMessages,
})

// 2. Create fluenti instance (new migrated translations)
const fluenti = createFluentVue({
  locale: 'en',
  fallbackLocale: 'en',
  messages: fluentMessages,
})

// 3. Bridge them together
const bridge = createFluentBridge({
  vueI18n,
  fluenti,
  priority: 'fluenti-first',
})

const app = createApp(App)
app.use(bridge)
app.mount('#app')
