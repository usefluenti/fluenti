import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        transforms: 'src/transforms.ts',
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [/^node:/, 'acorn'],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [
    dts({ rollupTypes: false }),
  ],
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 90,
        branches: 85,
        functions: 90,
        statements: 90,
      },
    },
    benchmark: {
      include: ['bench/**/*.bench.ts'],
    },
  },
})
