import { createPackageConfig } from '../../scripts/vite-config-factory'
import { useClientPlugin } from '../../scripts/use-client-plugin'

export default createPackageConfig({
  entry: {
    index: 'src/index.ts',
    server: 'src/server.ts',
    provider: 'src/provider.ts',
    loader: 'src/loader.ts',
  },
  external: ['react', 'react-dom', 'next', 'webpack', /^@fluenti\/core/, /^@fluenti\/react/, /^node:/],
  coverage: { lines: 70, branches: 65, functions: 70, statements: 70 },
  dtsOptions: { exclude: ['src/loader.ts'] },
  plugins: [useClientPlugin({ files: ['provider'] })],
})
