import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import fluenti from '@fluenti/vite-plugin'

export default defineConfig({
  plugins: [
    solidPlugin(),
    fluenti({ framework: 'solid' }),
  ],
})
