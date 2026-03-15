import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fluenti from '@fluenti/vite-plugin'

export default defineConfig({
  plugins: [
    vue(),
    fluenti({ framework: 'vue' }),
  ],
})
