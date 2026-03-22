import { createPackageConfig } from '../../scripts/vite-config-factory'

export default createPackageConfig({
  entry: {
    index: 'src/index.ts',
    'sfc-transform': 'src/sfc-transform.ts',
  },
  external: ['vite', /^@fluenti\/core/, '@vue/compiler-sfc', /^node:/],
  coverage: { lines: 70, branches: 65, functions: 70, statements: 70 },
  dtsOptions: { tsconfigPath: './tsconfig.build.json' },
})
