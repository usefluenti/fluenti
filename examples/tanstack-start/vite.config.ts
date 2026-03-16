import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import tsConfigPaths from 'vite-tsconfig-paths'
import fluenti from '@fluenti/vite-plugin'

export default defineConfig({
  server: {
    port: 5191,
  },
  plugins: [
    tsConfigPaths(),
    fluenti({ framework: 'react' }),
    tanstackStart(),
    react(),
  ],
})
