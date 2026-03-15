import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    headless: true,
    baseURL: 'http://localhost:5177',
  },
  testMatch: '**/svelte.spec.ts',
  webServer: {
    command: 'cd examples/svelte && pnpm build && pnpm preview --port 5177',
    port: 5177,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
