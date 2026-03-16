export default {
  sourceLocale: 'en',
  locales: ['en', 'zh-CN', 'ja'],
  catalogDir: './locales',
  format: 'po' as const,
  include: ['./src/**/*.{tsx,ts}'],
  compileOutDir: './src/locales/compiled',
}
