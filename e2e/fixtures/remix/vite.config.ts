import { defineConfig } from 'vite'
import { vitePlugin as remix } from '@remix-run/dev'
import fluenti from '@fluenti/vite-plugin'

export default defineConfig({
  plugins: [
    fluenti({ framework: 'react' }),
    remix({
      ssr: false,
    }),
  ],
})
