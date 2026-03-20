import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import tsConfigPaths from 'vite-tsconfig-paths'
import fluentiReact from '@fluenti/react/vite-plugin'

export default defineConfig({
  server: {
    port: 5191,
  },
  plugins: [
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    fluentiReact(),
    tanstackStart(),
    react(),
  ],
})
