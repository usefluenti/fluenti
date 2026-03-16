import { defineConfig } from '@fluenti/cli'

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'ja', 'zh-CN'],
  catalogDir: './locales',
  format: 'po',
  include: ['./src/**/*.{tsx,ts}'],
  compileOutDir: './src/locales/compiled',
})
