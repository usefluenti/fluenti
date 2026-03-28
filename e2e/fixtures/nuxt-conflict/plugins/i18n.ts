import { createFluenti } from '@fluenti/vue'
import { interpolate } from '@fluenti/core/internal'

const messages = {
  en: {
    'home.title': 'Welcome Home',
    'home.description': 'This is the home page',
  },
  ja: {
    'home.title': 'ようこそ',
    'home.description': 'これはホームページです',
  },
  zh: {
    'home.title': '欢迎回家',
    'home.description': '这是首页',
  },
}

export default defineNuxtPlugin((nuxtApp) => {
  const fluenti = createFluenti({
    locale: nuxtApp.$fluentiLocale?.value ?? 'en',
    interpolate,
    messages,
  })
  nuxtApp.vueApp.use(fluenti)

  if (nuxtApp.$fluentiLocale) {
    watch(nuxtApp.$fluentiLocale, (newLocale: string) => {
      fluenti.global.setLocale(newLocale)
    })
  }
})
