import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fluentiReact from '@fluenti/react/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    fluentiReact({
      catalogDir: 'src/locales/compiled',
      sourceLocale: 'en',
      locales: ['en', 'ja'],
      splitting: 'dynamic',
    }),
  ],
})
