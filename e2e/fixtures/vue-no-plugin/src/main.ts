import { createApp } from 'vue'
import { createFluenti } from '@fluenti/vue'
import { interpolate } from '@fluenti/vue/components'
import * as components from '@fluenti/vue/components'
import App from './App.vue'
import en from './locales/compiled/en.js'
import ja from './locales/compiled/ja.js'
import zhCN from './locales/compiled/zh-CN.js'

const app = createApp(App)
app.use(createFluenti({
  locale: 'en',
  fallbackLocale: 'en',
  interpolate,
  components,
  messages: {
    en,
    ja,
    'zh-CN': zhCN,
  },
}))
app.mount('#app')
