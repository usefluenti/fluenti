import { defineConfig } from '@fluenti/cli'

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'ja', 'ar'],
  catalogDir: './locales',
  format: 'po',
  include: ['./pages/**/*.vue', './components/**/*.vue', './plugins/**/*.ts'],
  compileOutDir: './locales/compiled',
})
