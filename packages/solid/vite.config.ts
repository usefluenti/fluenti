import solidPlugin from 'vite-plugin-solid'
import { createPackageConfig } from '../../scripts/vite-config-factory'

export default createPackageConfig({
  entry: {
    index: 'src/index.ts',
    'vite-plugin': 'src/vite-plugin.ts',
  },
  external: ['solid-js', 'solid-js/web', 'solid-js/jsx-runtime', 'solid-js/store', '@fluenti/core', /^@fluenti\/vite-plugin/, 'vite', /^node:/],
  testEnv: 'happy-dom',
  coverage: { lines: 80, branches: 75, functions: 80, statements: 80 },
  plugins: [solidPlugin()],
})
