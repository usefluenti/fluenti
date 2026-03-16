import { createFluentVue } from '@fluenti/vue'

const messages = {
  en: {
    'home.title': 'Welcome Home',
    'home.description': 'This is the home page',
    'about.title': 'About Us',
    'about.description': 'Learn more about our project',
    'nav.home': 'Home',
    'nav.about': 'About',
  },
  ja: {
    'home.title': 'ようこそ',
    'home.description': 'これはホームページです',
    'about.title': '私たちについて',
    'about.description': 'プロジェクトの詳細',
    'nav.home': 'ホーム',
    'nav.about': '概要',
  },
  zh: {
    'home.title': '欢迎回家',
    'home.description': '这是首页',
    'about.title': '关于我们',
    'about.description': '了解更多',
    'nav.home': '首页',
    'nav.about': '关于',
  },
}

export default defineNuxtPlugin((nuxtApp) => {
  const fluenti = createFluentVue({
    locale: nuxtApp.$fluentiLocale?.value ?? 'en',
    messages,
  })
  nuxtApp.vueApp.use(fluenti)

  // Sync locale when $fluentiLocale changes
  if (nuxtApp.$fluentiLocale) {
    watch(nuxtApp.$fluentiLocale, (newLocale: string) => {
      fluenti.global.setLocale(newLocale)
    })
  }
})
