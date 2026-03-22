import { createPackageConfig } from '../../scripts/vite-config-factory'

export default createPackageConfig({
  entry: {
    index: 'src/index.ts',
    internal: 'src/internal.ts',
    'internal-browser': 'src/internal-browser.ts',
    config: 'src/config.ts',
  },
  external: [/^node:/, 'jiti'],
  coverage: { lines: 90, branches: 85, functions: 90, statements: 90 },
  minify: false,
  testOverrides: {
    benchmark: { include: ['bench/**/*.bench.ts'] },
  },
})
