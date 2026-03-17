import { defineConfig } from '@playwright/test'

// Map each project to its webServer config
const serverMap: Record<string, { command: string; port: number; timeout?: number }> = {
  vue:               { command: 'cd examples/vue && pnpm build && pnpm preview --port 5173', port: 5173 },
  solid:             { command: 'cd examples/solid && pnpm build && pnpm preview --port 5174', port: 5174 },
  nuxt:              { command: 'cd examples/nuxt && pnpm build && pnpm preview', port: 5175 },
  'solid-start':     { command: 'cd examples/solid-start && pnpm build && pnpm preview', port: 5176 },
  react:             { command: 'cd examples/react && pnpm build && pnpm preview --port 5177', port: 5177 },
  'splitting-vue':   { command: 'cd e2e/fixtures/vue-splitting && pnpm build && pnpm preview --port 5180', port: 5180 },
  'vue-i18n-bridge': { command: 'cd e2e/fixtures/vue-i18n-bridge && pnpm build && pnpm preview --port 5181', port: 5181 },
  'vue-routes':      { command: 'cd e2e/fixtures/vue-routes && pnpm build && pnpm preview --port 5191', port: 5191 },
  'nuxt-routes':     { command: 'cd e2e/fixtures/nuxt-routes && pnpm build && pnpm preview --port 5182', port: 5182 },
  'nuxt-ssg':        { command: 'cd e2e/fixtures/nuxt-ssg && pnpm generate && npx serve .output/public -l 5183', port: 5183, timeout: 120_000 },
  'nuxt-spa':        { command: 'cd e2e/fixtures/nuxt-spa && pnpm build && pnpm preview --port 5184', port: 5184, timeout: 120_000 },
  'nuxt-custom-detect': { command: 'cd e2e/fixtures/nuxt-custom-detect && pnpm build && pnpm preview --port 5185', port: 5185, timeout: 120_000 },
  'nuxt-prefix':     { command: 'cd e2e/fixtures/nuxt-prefix && pnpm build && pnpm preview --port 5186', port: 5186, timeout: 120_000 },
  'splitting-react': { command: 'cd e2e/fixtures/react-splitting && pnpm build && pnpm preview --port 5187', port: 5187 },
  'react-router':    { command: 'cd e2e/fixtures/react-router && pnpm build && pnpm preview --port 5188', port: 5188 },
  remix:             { command: 'cd e2e/fixtures/remix && pnpm build && pnpm preview --port 5189', port: 5189 },
  nextjs:            { command: 'cd e2e/fixtures/nextjs && pnpm build && pnpm start -p 5190', port: 5190, timeout: 120_000 },
  'react-no-plugin': { command: 'cd e2e/fixtures/react-no-plugin && pnpm build && pnpm preview --port 5192', port: 5192 },
  'solid-no-plugin': { command: 'cd e2e/fixtures/solid-no-plugin && pnpm build && pnpm preview --port 5193', port: 5193 },
}

// Filter webServers to only those needed by the selected projects.
// Set E2E_PROJECTS="vue,solid" to only start vue and solid servers.
const selectedProjects = process.env['E2E_PROJECTS']?.split(',') ?? Object.keys(serverMap)

const webServer = selectedProjects
  .filter((p) => serverMap[p])
  .map((p) => ({
    command: serverMap[p]!.command,
    port: serverMap[p]!.port,
    reuseExistingServer: true,
    timeout: serverMap[p]!.timeout ?? 60_000,
  }))

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    headless: true,
  },
  projects: [
    { name: 'vue', use: { baseURL: 'http://localhost:5173' }, testMatch: '**/vue.spec.ts' },
    { name: 'solid', use: { baseURL: 'http://localhost:5174' }, testMatch: '**/solid.spec.ts' },
    { name: 'nuxt', use: { baseURL: 'http://localhost:5175' }, testMatch: '**/nuxt.spec.ts' },
    { name: 'solid-start', use: { baseURL: 'http://localhost:5176' }, testMatch: '**/solid-start.spec.ts' },
    { name: 'react', use: { baseURL: 'http://localhost:5177' }, testMatch: '**/react.spec.ts' },
    { name: 'splitting-vue', use: { baseURL: 'http://localhost:5180' }, testMatch: '**/splitting-vue.spec.ts' },
    { name: 'vue-i18n-bridge', use: { baseURL: 'http://localhost:5181' }, testMatch: '**/vue-i18n-bridge.spec.ts' },
    { name: 'vue-routes', use: { baseURL: 'http://localhost:5191' }, testMatch: '**/vue-routes.spec.ts' },
    { name: 'nuxt-routes', use: { baseURL: 'http://localhost:5182' }, testMatch: '**/nuxt-routes.spec.ts' },
    { name: 'nuxt-ssg', use: { baseURL: 'http://localhost:5183' }, testMatch: '**/nuxt-ssg.spec.ts' },
    { name: 'nuxt-spa', use: { baseURL: 'http://localhost:5184' }, testMatch: '**/nuxt-spa.spec.ts' },
    { name: 'nuxt-custom-detect', use: { baseURL: 'http://localhost:5185' }, testMatch: '**/nuxt-custom-detect.spec.ts' },
    { name: 'nuxt-prefix', use: { baseURL: 'http://localhost:5186' }, testMatch: '**/nuxt-prefix.spec.ts' },
    { name: 'splitting-react', use: { baseURL: 'http://localhost:5187' }, testMatch: '**/splitting-react.spec.ts' },
    { name: 'react-router', use: { baseURL: 'http://localhost:5188' }, testMatch: '**/react-router.spec.ts' },
    { name: 'remix', use: { baseURL: 'http://localhost:5189' }, testMatch: '**/remix.spec.ts' },
    { name: 'nextjs', use: { baseURL: 'http://localhost:5190' }, testMatch: '**/nextjs.spec.ts' },
    { name: 'react-no-plugin', use: { baseURL: 'http://localhost:5192' }, testMatch: '**/react-no-plugin.spec.ts' },
    { name: 'solid-no-plugin', use: { baseURL: 'http://localhost:5193' }, testMatch: '**/solid-no-plugin.spec.ts' },
  ],
  webServer,
})
