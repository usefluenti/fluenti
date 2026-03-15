export default {
  sourceLocale: 'en',
  locales: ['en', 'ja'],
  catalogDir: './locales',
  format: 'po' as const,
  include: ['./app/**/*.{tsx,ts}'],
  compileOutDir: './app/locales/compiled',
}
