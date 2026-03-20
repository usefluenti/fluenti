import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        'vite-plugin': 'src/vite-plugin.ts',
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['solid-js', 'solid-js/web', 'solid-js/jsx-runtime', 'solid-js/store', '@fluenti/core', /^@fluenti\/vite-plugin/, 'vite', /^node:/],
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
