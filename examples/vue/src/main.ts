import { createApp } from 'vue'
import { createFluenti } from '@fluenti/vue'
import App from './App.vue'
import en from './locales/compiled/en.js'
import zhCN from './locales/compiled/zh-CN.js'
import ja from './locales/compiled/ja.js'

const fluent = createFluenti({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN,
    ja,
  },
})

const app = createApp(App)
app.use(fluent)
app.mount('#app')
