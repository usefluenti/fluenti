import { defineConfig } from '@fluenti/cli'

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'zh-CN', 'ja'],
  catalogDir: './locales',
  format: 'po',
  include: ['./src/**/*.{vue,ts}'],
  compileOutDir: './src/locales/compiled',
})
