import { defineConfig } from '@fluenti/core'

export default defineConfig({
  extends: '../../fluenti.config.ts',
  catalogDir: '../../locales',
  include: ['./src/**/*.{tsx,ts}'],
  compileOutDir: './src/locales/compiled',
})
