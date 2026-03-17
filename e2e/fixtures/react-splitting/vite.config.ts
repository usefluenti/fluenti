import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fluenti from '@fluenti/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    fluenti({
      framework: 'react',
      catalogDir: 'src/locales/compiled',
      sourceLocale: 'en',
      locales: ['en', 'ja'],
      splitting: 'dynamic',
    }),
  ],
})
