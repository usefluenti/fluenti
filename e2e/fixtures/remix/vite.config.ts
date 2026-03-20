import { defineConfig } from 'vite'
import { vitePlugin as remix } from '@remix-run/dev'
import fluentiReact from '@fluenti/react/vite-plugin'

export default defineConfig({
  plugins: [
    fluentiReact(),
    remix({
      ssr: false,
    }),
  ],
})
