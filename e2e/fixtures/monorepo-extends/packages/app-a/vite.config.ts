import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fluentiReact from '@fluenti/react/vite-plugin'

export default defineConfig({
  plugins: [
    fluentiReact(),
    react(),
  ],
})
