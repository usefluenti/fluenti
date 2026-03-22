import { createPackageConfig } from '../../scripts/vite-config-factory'

export default createPackageConfig({
  entry: {
    index: 'src/index.ts',
    'vite-plugin': 'src/vite-plugin.ts',
  },
  external: ['vue', '@fluenti/core', /^@fluenti\/vite-plugin/, 'vite', /^node:/],
  testEnv: 'happy-dom',
  coverage: { lines: 80, branches: 75, functions: 80, statements: 80 },
  testOverrides: {
    testTimeout: process.env.CI ? 15_000 : 5_000,
    hookTimeout: process.env.CI ? 15_000 : 5_000,
  },
})
