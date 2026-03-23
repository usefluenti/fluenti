import { createFluenti } from '@fluenti/vue'
import { getHydratedLocale } from '@fluenti/core'
import en from '~/locales/compiled/en.js'
import ja from '~/locales/compiled/ja.js'
import ar from '~/locales/compiled/ar.js'

export default defineNuxtPlugin((nuxtApp) => {
  // Read locale from the detection plugin (nuxt module sets this in payload)
  // Falls back to event context, hydration script, or default.
  let initialLocale = 'en'

  if (nuxtApp.payload?.['fluentiLocale']) {
    initialLocale = nuxtApp.payload['fluentiLocale'] as string
  } else if (import.meta.server) {
    const event = useRequestEvent()
    initialLocale = (event?.context?.['locale'] as string) ?? 'en'
  } else {
    initialLocale = getHydratedLocale('en')
  }

  const fluent = createFluenti({
    locale: initialLocale,
    fallbackLocale: 'en',
    fallbackChain: {
      ja: ['en'],
      ar: ['en'],
    },
    messages: {
      en,
      ja,
      ar,
    },
  })

  nuxtApp.vueApp.use(fluent)

  return {
    provide: {
      fluent: fluent.global,
    },
  }
})
