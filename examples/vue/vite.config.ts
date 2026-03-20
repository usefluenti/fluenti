import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fluentiVue from '@fluenti/vue/vite-plugin'

export default defineConfig({
  plugins: [
    vue(),
    fluentiVue(),
  ],
})
