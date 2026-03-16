export default {
  sourceLocale: 'en',
  locales: ['en', 'ja', 'ar'],
  catalogDir: './locales',
  format: 'po' as const,
  include: ['./src/**/*.{tsx,ts}'],
  compileOutDir: './src/locales/compiled',
}
