import { createPackageConfig } from '../../scripts/vite-config-factory'

export default createPackageConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
    'vue-extractor': 'src/vue-extractor.ts',
    'compile-worker': 'src/compile-worker.ts',
  },
  external: [/^@fluenti\/core(?:\/.*)?$/, '@vue/compiler-sfc', 'gettext-parser', 'citty', 'consola', 'fast-glob', 'jiti', /^node:/],
  coverage: { lines: 70, branches: 65, functions: 70, statements: 70 },
  coverageExclude: ['src/cli.ts', 'node_modules/**'],
})
