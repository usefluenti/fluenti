import { createFluentVue } from '@fluenti/vue'

const messages = {
  en: {
    'home.title': 'Welcome Home',
    'home.description': 'This page is served via ISR',
    'about.title': 'About Us',
  },
  ja: {
    'home.title': 'ようこそ',
    'home.description': 'このページはISRで配信されています',
    'about.title': '私たちについて',
  },
  zh: {
    'home.title': '欢迎回家',
    'home.description': '此页面通过ISR提供',
    'about.title': '关于我们',
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
