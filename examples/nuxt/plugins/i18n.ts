import { createFluentVue } from '@fluenti/vue'
import { getHydratedLocale } from '@fluenti/core'
import en from '~/locales/compiled/en.js'
import ja from '~/locales/compiled/ja.js'

export default defineNuxtPlugin((nuxtApp) => {
  // On the server, read locale from the event context (set by server plugin).
  // On the client, read from the SSR-injected window variable or cookie.
  let initialLocale = 'en'

  if (import.meta.server) {
    const event = useRequestEvent()
    initialLocale = (event?.context?.['locale'] as string) ?? 'en'
  } else {
    initialLocale = getHydratedLocale('en')
  }

  const fluent = createFluentVue({
    locale: initialLocale,
    fallbackLocale: 'en',
    fallbackChain: {
      ja: ['en'],
    },
    messages: {
      en,
      ja,
    },
  })

  nuxtApp.vueApp.use(fluent)

  return {
    provide: {
      fluent: fluent.global,
    },
  }
})
