import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'packages/core',
      'packages/vue',
      'packages/solid',
      'packages/svelte',
      'packages/cli',
      'packages/vite-plugin',
    ],
  },
})
