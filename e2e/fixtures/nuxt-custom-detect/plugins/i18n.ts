import { createFluenti } from '@fluenti/vue'
import { interpolate } from '@fluenti/core/internal'

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
