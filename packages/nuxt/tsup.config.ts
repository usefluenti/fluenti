import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    module: 'src/module.ts',
    'runtime/index': 'src/runtime/index.ts',
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
    '#imports',
    '@nuxt/kit',
    '@fluenti/core',
    '@fluenti/vue',
    '@fluenti/vite-plugin',
  ],
})
