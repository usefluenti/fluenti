import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue', 'vue-i18n', '@fluenti/core', '@fluenti/vue'],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [
    dts({ rollupTypes: false }),
  ],
  test: {
    environment: 'happy-dom',
  },
})
