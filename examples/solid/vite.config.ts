import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import fluentiSolid from '@fluenti/solid/vite-plugin'

export default defineConfig({
  plugins: [
    solidPlugin(),
    fluentiSolid(),
  ],
})
