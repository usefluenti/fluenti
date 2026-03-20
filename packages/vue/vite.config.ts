import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'

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
      external: ['vue', '@fluenti/core', /^@fluenti\/vite-plugin/, 'vite', /^node:/],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [
    dts({ rollupTypes: false }),
  ],
  test: {
    environment: 'happy-dom',
    testTimeout: process.env.CI ? 15_000 : 5_000,
    hookTimeout: process.env.CI ? 15_000 : 5_000,
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
