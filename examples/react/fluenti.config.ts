import { defineConfig } from '@fluenti/cli'

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'zh-CN', 'ja', 'ar'],
  catalogDir: './locales',
  format: 'po',
  include: ['./src/**/*.{tsx,ts}'],
  compileOutDir: './src/locales/compiled',
})
