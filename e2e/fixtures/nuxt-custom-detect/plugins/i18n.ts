import { createFluentVue } from '@fluenti/vue'

const messages = {
  en: {
    'home.title': 'Welcome Home',
    'nav.home': 'Home',
  },
  ja: {
    'home.title': 'ようこそ',
    'nav.home': 'ホーム',
  },
  zh: {
    'home.title': '欢迎回家',
    'nav.home': '首页',
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
