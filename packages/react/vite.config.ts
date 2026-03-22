import { createPackageConfig } from '../../scripts/vite-config-factory'
import { useClientPlugin } from '../../scripts/use-client-plugin'

export default createPackageConfig({
  entry: {
    index: 'src/index.ts',
    server: 'src/server.ts',
    'vite-plugin': 'src/vite-plugin.ts',
  },
  external: [/^react(?:\/.*)?$/, /^react-dom(?:\/.*)?$/, '@fluenti/core', /^@fluenti\/vite-plugin/, 'vite', /^node:/],
  testEnv: 'happy-dom',
  coverage: { lines: 80, branches: 75, functions: 80, statements: 80 },
  plugins: [useClientPlugin({ files: ['index'] })],
})
