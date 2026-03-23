import { createApp } from 'vue'
import { createFluenti } from '@fluenti/vue'
import App from './App.vue'
import en from './locales/compiled/en.js'
import zhCN from './locales/compiled/zh-CN.js'
import ja from './locales/compiled/ja.js'
import ar from './locales/compiled/ar.js'

const cookieLocale = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/)?.[1]

const fluent = createFluenti({
  locale: cookieLocale || 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN,
    ja,
    ar,
  },
})

const app = createApp(App)
app.use(fluent)
app.mount('#app')
