import { createFluentVue } from '@fluenti/vue'

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
