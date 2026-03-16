import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: {
        module: 'src/module.ts',
        'runtime/index': 'src/runtime/index.ts',
        'runtime/plugin': 'src/runtime/plugin.ts',
        'runtime/client': 'src/runtime/client.ts',
        'runtime/composables': 'src/runtime/composables.ts',
        'runtime/components/NuxtLinkLocale': 'src/runtime/components/NuxtLinkLocale.ts',
        'runtime/middleware/locale-redirect': 'src/runtime/middleware/locale-redirect.ts',
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
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
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [
    dts({ rollupTypes: false }),
  ],
  test: {
    environment: 'node',
  },
})
