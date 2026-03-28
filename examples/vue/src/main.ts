import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createFluenti } from '@fluenti/vue'
import { interpolate } from '@fluenti/vue/components'
import * as components from '@fluenti/vue/components'
import App from './App.vue'
import './global.css'
import en from './locales/compiled/en.js'
import zhCN from './locales/compiled/zh-CN.js'
import ja from './locales/compiled/ja.js'
import ar from './locales/compiled/ar.js'

const cookieLocale = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/)?.[1]

const fluent = createFluenti({
  locale: cookieLocale || 'en',
  fallbackLocale: 'en',
  interpolate,
  components,
  messages: {
    en,
    'zh-CN': zhCN,
    ja,
    ar,
  },
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./pages/Home.vue') },
    { path: '/plurals', component: () => import('./pages/Plurals.vue') },
    { path: '/richtext', component: () => import('./pages/RichText.vue') },
    { path: '/formatting', component: () => import('./pages/Formatting.vue') },
    { path: '/directives', component: () => import('./pages/Directives.vue') },
    { path: '/script', component: () => import('./pages/Script.vue') },
  ],
})

const app = createApp(App)
app.use(fluent)
app.use(router)
app.mount('#app')
