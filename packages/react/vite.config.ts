import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'
import { useClientPlugin } from '../../scripts/use-client-plugin'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        server: 'src/server.ts',
        'vite-plugin': 'src/vite-plugin.ts',
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        /^react(?:\/.*)?$/,
        /^react-dom(?:\/.*)?$/,
        '@fluenti/core',
        /^@fluenti\/vite-plugin/,
        'vite',
        /^node:/,
      ],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [
    dts({ rollupTypes: false }),
    useClientPlugin({ files: ['index'] }),
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
