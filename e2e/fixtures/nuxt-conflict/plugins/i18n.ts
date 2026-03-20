import { createFluentVue } from '@fluenti/vue'

const messages = {
  en: {
    'home.title': 'Welcome Home',
    'home.description': 'This is the home page',
    'about.title': 'About Us',
    'no-middleware.title': 'No Middleware Page',
  },
  ja: {
    'home.title': 'ようこそ',
    'home.description': 'これはホームページです',
    'about.title': '私たちについて',
    'no-middleware.title': 'ミドルウェアなしページ',
  },
  zh: {
    'home.title': '欢迎回家',
    'home.description': '这是首页',
    'about.title': '关于我们',
    'no-middleware.title': '无中间件页面',
  },
}

export default defineNuxtPlugin((nuxtApp) => {
  const fluenti = createFluentVue({
    locale: nuxtApp.$fluentiLocale?.value ?? 'en',
    messages,
  })
  nuxtApp.vueApp.use(fluenti)

  if (nuxtApp.$fluentiLocale) {
    watch(nuxtApp.$fluentiLocale, (newLocale: string) => {
      fluenti.global.setLocale(newLocale)
    })
  }
})
