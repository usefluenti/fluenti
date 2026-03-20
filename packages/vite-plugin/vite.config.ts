import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        'sfc-transform': 'src/sfc-transform.ts',
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['vite', /^@fluenti\/core/, '@vue/compiler-sfc', /^node:/],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [
    dts({ rollupTypes: false, tsconfigPath: './tsconfig.build.json' }),
  ],
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 70,
        branches: 65,
        functions: 70,
        statements: 70,
      },
    },
  },
})
