import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fluenti from '@fluenti/vite-plugin'

export default defineConfig({
  plugins: [
    fluenti({ framework: 'react' }),
    react(),
  ],
})
