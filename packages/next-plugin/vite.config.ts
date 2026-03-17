import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'
import { useClientPlugin } from '../../scripts/use-client-plugin'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        server: 'src/server.ts',
        provider: 'src/provider.ts',
        loader: 'src/loader.ts',
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'next', 'webpack', /^@fluenti\/core/, /^@fluenti\/react/, /^node:/],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [
    dts({ rollupTypes: false, exclude: ['src/loader.ts'] }),
    useClientPlugin({ files: ['provider'] }),
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
