import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: { headless: true, baseURL: 'http://localhost:5190' },
  projects: [{ name: 'nextjs', testMatch: '**/nextjs.spec.ts' }],
})
