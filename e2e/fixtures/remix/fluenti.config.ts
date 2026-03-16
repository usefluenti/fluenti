export default {
  sourceLocale: 'en',
  locales: ['en', 'ja', 'ar'],
  catalogDir: './locales',
  format: 'po' as const,
  include: ['./app/**/*.{tsx,ts}'],
  compileOutDir: './app/locales/compiled',
}
