import { createPackageConfig } from '../../scripts/vite-config-factory'

export default createPackageConfig({
  entry: {
    index: 'src/index.ts',
    runtime: 'src/runtime.ts',
    compiler: 'src/compiler.ts',
    'ssr-entry': 'src/ssr-entry.ts',
    'formatters-entry': 'src/formatters-entry.ts',
    transform: 'src/transform.ts',
    'transform-browser': 'src/transform-browser.ts',
    config: 'src/config.ts',
  },
  external: [/^node:/, 'jiti'],
  coverage: { lines: 90, branches: 85, functions: 90, statements: 90 },
  minify: false,
  testOverrides: {
    benchmark: { include: ['bench/**/*.bench.ts'] },
  },
})
