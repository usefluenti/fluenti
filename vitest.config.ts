import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'packages/core',
      'packages/vue',
      'packages/solid',
      'packages/react',
      'packages/cli',
      'packages/vite-plugin',
      'packages/next-plugin',
      'packages/nuxt',
      'packages/vue-i18n-compat',
    ],
  },
})
