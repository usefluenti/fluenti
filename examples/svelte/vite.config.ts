import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fluenti from '@fluenti/vite-plugin'

export default defineConfig({
  plugins: [
    svelte(),
    fluenti({ framework: 'svelte' }),
  ],
})
