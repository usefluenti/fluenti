import { defineConfig } from '@fluenti/cli'

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'ja', 'ar'],
  catalogDir: './locales',
  format: 'po',
  include: ['./app/**/*.{tsx,ts}'],
  compileOutDir: './app/locales/compiled',
})
