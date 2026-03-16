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
      name: 'react',
      use: { baseURL: 'http://localhost:5177' },
      testMatch: '**/react.spec.ts',
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
    {
      name: 'nuxt-spa',
      use: { baseURL: 'http://localhost:5184' },
      testMatch: '**/nuxt-spa.spec.ts',
    },
    {
      name: 'nuxt-custom-detect',
      use: { baseURL: 'http://localhost:5185' },
      testMatch: '**/nuxt-custom-detect.spec.ts',
    },
    {
      name: 'nuxt-prefix',
      use: { baseURL: 'http://localhost:5186' },
      testMatch: '**/nuxt-prefix.spec.ts',
    },
    {
      name: 'splitting-react',
      use: { baseURL: 'http://localhost:5187' },
      testMatch: '**/splitting-react.spec.ts',
    },
    {
      name: 'react-router',
      use: { baseURL: 'http://localhost:5188' },
      testMatch: '**/react-router.spec.ts',
    },
    {
      name: 'remix',
      use: { baseURL: 'http://localhost:5189' },
      testMatch: '**/remix.spec.ts',
    },
    {
      name: 'nextjs',
      use: { baseURL: 'http://localhost:5190' },
      testMatch: '**/nextjs.spec.ts',
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
      command: 'cd examples/react && pnpm build && pnpm preview --port 5177',
      port: 5177,
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
    {
      command: 'cd e2e/fixtures/nuxt-spa && pnpm build && pnpm preview --port 5184',
      port: 5184,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'cd e2e/fixtures/nuxt-custom-detect && pnpm build && pnpm preview --port 5185',
      port: 5185,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'cd e2e/fixtures/nuxt-prefix && pnpm build && pnpm preview --port 5186',
      port: 5186,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'cd e2e/fixtures/react-splitting && pnpm build && pnpm preview --port 5187',
      port: 5187,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'cd e2e/fixtures/react-router && pnpm build && pnpm preview --port 5188',
      port: 5188,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'cd e2e/fixtures/remix && pnpm build && pnpm preview --port 5189',
      port: 5189,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'cd e2e/fixtures/nextjs && pnpm build && pnpm start -p 5190',
      port: 5190,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
})
