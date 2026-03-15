import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['src/cli.ts', 'node_modules/**'],
      thresholds: {
        lines: 70,
        branches: 65,
        functions: 70,
        statements: 70,
      }
    }
  }
})
