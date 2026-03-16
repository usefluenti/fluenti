import { createRouter, createWebHistory } from 'vue-router'
import { extendPages, type PageRoute } from '@fluenti/nuxt/client'
import Home from './pages/Home.vue'
import About from './pages/About.vue'
import Contact from './pages/Contact.vue'

// Define base routes
const basePages: PageRoute[] = [
  { path: '/', name: 'home' },
  { path: '/about', name: 'about' },
  { path: '/contact', name: 'contact' },
]

// Extend with locale prefixed routes (prefix_except_default strategy)
extendPages(basePages, {
  locales: ['en', 'ja', 'zh'],
  defaultLocale: 'en',
  strategy: 'prefix_except_default',
})

// Map route definitions to vue-router routes with components
const componentMap: Record<string, any> = {
  home: Home,
  about: About,
  contact: Contact,
}

const routes = basePages.map((page) => {
  // Extract base name (remove locale suffix like ___ja)
  const baseName = page.name?.replace(/___\w+$/, '') ?? 'home'
  return {
    path: page.path,
    name: page.name,
    component: componentMap[baseName] ?? Home,
    meta: {
      locale: page.name?.includes('___') ? page.name.split('___')[1] : undefined,
    },
  }
})

export default createRouter({
  history: createWebHistory(),
  routes,
})
