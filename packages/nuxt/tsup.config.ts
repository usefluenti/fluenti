import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    module: 'src/module.ts',
    'runtime/index': 'src/runtime/index.ts',
    'runtime/plugin': 'src/runtime/plugin.ts',
    'runtime/composables': 'src/runtime/composables.ts',
    'runtime/components/NuxtLinkLocale': 'src/runtime/components/NuxtLinkLocale.ts',
    'runtime/middleware/locale-redirect': 'src/runtime/middleware/locale-redirect.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    'vue',
    'vue-router',
    'nuxt',
    'nuxt/app',
    '#app',
    '#components',
    '#imports',
    '@nuxt/kit',
    '@fluenti/core',
    '@fluenti/vue',
    '@fluenti/vite-plugin',
  ],
})
