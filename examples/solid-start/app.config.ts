import { defineConfig } from '@solidjs/start/config'
import fluentiSolid from '@fluenti/solid/vite-plugin'

export default defineConfig({
  server: {
    preset: 'node-server',
  },
  vite: {
    plugins: [
      fluentiSolid({
        sourceLocale: 'en',
        locales: ['en', 'ja', 'zh-CN'],
        catalogDir: 'src/locales/compiled',
      }),
    ],
  },
})
