export default {
  sourceLocale: 'en',
  locales: ['en', 'zh-CN', 'ja'],
  catalogDir: './locales',
  format: 'po' as const,
  include: ['./src/**/*.{vue,ts}'],
  compileOutDir: './src/locales/compiled',
}
