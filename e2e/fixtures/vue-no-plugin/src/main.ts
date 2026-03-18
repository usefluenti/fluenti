import { createApp } from 'vue'
import { createFluentVue } from '@fluenti/vue'
import App from './App.vue'
import en from './locales/compiled/en.js'
import ja from './locales/compiled/ja.js'
import zhCN from './locales/compiled/zh-CN.js'

const app = createApp(App)
app.use(createFluentVue({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    ja,
    'zh-CN': zhCN,
  },
}))
app.mount('#app')
