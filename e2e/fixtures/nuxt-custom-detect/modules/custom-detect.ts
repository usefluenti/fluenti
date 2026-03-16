import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'

/**
 * Local Nuxt module that registers a custom locale detector.
 * Uses addPlugin with a low order to ensure it runs before the fluenti runtime plugin.
 */
export default defineNuxtModule({
  meta: { name: 'custom-detect' },
  setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)
    addPlugin({
      src: resolve('../runtime/detect-plugin'),
      mode: 'all',
      order: -1,
    })
  },
})
