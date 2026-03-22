import { createPackageConfig } from '../../scripts/vite-config-factory'

export default createPackageConfig({
  entry: { index: 'src/index.ts' },
  external: ['vue', 'vue-i18n', '@fluenti/core', '@fluenti/vue'],
  testEnv: 'happy-dom',
  coverage: { lines: 80, branches: 75, functions: 80, statements: 80 },
})
