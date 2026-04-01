import { createFluenti } from '@fluenti/vue'
import { interpolate } from '@fluenti/core/runtime'

const messages = {
  en: {
    'home.title': 'Welcome Home',
    'admin.title': 'Admin Panel',
  },
  ja: {
    'home.title': 'ようこそ',
    'admin.title': '管理パネル',
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
