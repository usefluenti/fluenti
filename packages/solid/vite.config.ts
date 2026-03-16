import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['solid-js', 'solid-js/web', 'solid-js/jsx-runtime', '@fluenti/core'],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [
    solidPlugin(),
    dts({ rollupTypes: false }),
  ],
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
})
