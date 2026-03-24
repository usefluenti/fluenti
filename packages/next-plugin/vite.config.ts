import { createPackageConfig } from '../../scripts/vite-config-factory'
import { useClientPlugin } from '../../scripts/use-client-plugin'

export default createPackageConfig({
  entry: {
    index: 'src/index.ts',
    server: 'src/server.ts',
    provider: 'src/provider.ts',
    loader: 'src/loader.ts',
    middleware: 'src/middleware.ts',
    navigation: 'src/navigation.ts',
    'i18n-config': 'src/i18n-config.ts',
  },
  external: [/^react/, /^react-dom/, 'next', /^next\//, 'webpack', /^@fluenti\/core/, /^@fluenti\/react/, /^node:/, '@fluenti/next/i18n-config'],
  coverage: { lines: 70, branches: 65, functions: 70, statements: 70 },
  dtsOptions: { exclude: ['src/loader.ts'] },
  plugins: [useClientPlugin({ files: ['provider', 'navigation'] })],
})
