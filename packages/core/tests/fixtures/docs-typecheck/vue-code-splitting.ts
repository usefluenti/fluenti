import { createFluenti } from '@fluenti/vue'

const en = {
  'Welcome to Fluenti': 'Welcome to Fluenti',
}

export const vueCodeSplitting = createFluenti({
  locale: 'en',
  messages: { en },
  lazyLocaleLoading: true,
  chunkLoader: (locale) => import(`./locales/compiled/${locale}.js`),
})
