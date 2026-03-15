import { createApp } from 'vue'
import { createFluentVue } from '@fluenti/vue'
import App from './App.vue'
import en from './locales/compiled/en'
import zhCN from './locales/compiled/zh-CN'
import ja from './locales/compiled/ja'

const fluent = createFluentVue({
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
