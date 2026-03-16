import { defineConfig } from '@solidjs/start/config'
import fluenti from '@fluenti/vite-plugin'

export default defineConfig({
  server: {
    preset: 'node-server',
  },
  vite: {
    plugins: [
      fluenti({
        framework: 'solid',
        sourceLocale: 'en',
        locales: ['en', 'ja', 'zh-CN'],
        catalogDir: 'src/locales/compiled',
      }),
    ],
  },
})
