import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    headless: true,
  },
  projects: [
    {
      name: 'vue',
      use: { baseURL: 'http://localhost:5173' },
      testMatch: '**/vue.spec.ts',
    },
    {
      name: 'solid',
      use: { baseURL: 'http://localhost:5174' },
      testMatch: '**/solid.spec.ts',
    },
    {
      name: 'nuxt',
      use: { baseURL: 'http://localhost:5175' },
      testMatch: '**/nuxt.spec.ts',
    },
    {
      name: 'solid-start',
      use: { baseURL: 'http://localhost:5176' },
      testMatch: '**/solid-start.spec.ts',
    },
    {
      name: 'splitting-vue',
      use: { baseURL: 'http://localhost:5180' },
      testMatch: '**/splitting-vue.spec.ts',
    },
    {
      name: 'vue-i18n-bridge',
      use: { baseURL: 'http://localhost:5181' },
      testMatch: '**/vue-i18n-bridge.spec.ts',
    },
    {
      name: 'nuxt-routes',
      use: { baseURL: 'http://localhost:5182' },
      testMatch: '**/nuxt-routes.spec.ts',
    },
    {
      name: 'nuxt-ssg',
      use: { baseURL: 'http://localhost:5183' },
      testMatch: '**/nuxt-ssg.spec.ts',
    },
  ],
  webServer: [
    {
      command: 'cd examples/vue && pnpm build && pnpm preview --port 5173',
      port: 5173,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'cd examples/solid && pnpm build && pnpm preview --port 5174',
      port: 5174,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'cd examples/nuxt && pnpm build && pnpm preview',
      port: 5175,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'cd examples/solid-start && pnpm build && pnpm preview',
      port: 5176,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'cd e2e/fixtures/vue-splitting && pnpm build && pnpm preview --port 5180',
      port: 5180,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'cd e2e/fixtures/vue-i18n-bridge && pnpm build && pnpm preview --port 5181',
      port: 5181,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'cd e2e/fixtures/nuxt-routes && pnpm build && pnpm preview --port 5182',
      port: 5182,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'cd e2e/fixtures/nuxt-ssg && pnpm generate && npx serve .output/public -l 5183',
      port: 5183,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
})
