import { createFluentVue } from '@fluenti/vue'

const en = {
  'Welcome to Fluenti': 'Welcome to Fluenti',
}

export const vueCodeSplitting = createFluentVue({
  locale: 'en',
  messages: { en },
  lazyLocaleLoading: true,
  chunkLoader: (locale) => import(`./locales/compiled/${locale}.js`),
})
