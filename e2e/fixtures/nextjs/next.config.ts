import { withFluenti } from '@fluenti/next'

export default withFluenti({
  locales: ['en', 'ja', 'ar'],
  catalogDir: './locales',
  compileOutDir: './src/locales/compiled',
  format: 'po',
})({
  reactStrictMode: true,
})
