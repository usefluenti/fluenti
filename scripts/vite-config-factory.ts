/**
 * Shared Vite config factory for all Fluenti packages.
 *
 * Eliminates ~30 lines of duplicated config per package by extracting
 * the common build/test patterns into a single parameterized function.
 */
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { defineConfig, type UserConfig } from 'vitest/config'
import type { Plugin } from 'vite'

export interface PackageConfigOptions {
  /** Entry points (e.g. { index: 'src/index.ts', server: 'src/server.ts' }) */
  entry: Record<string, string>
  /** External dependencies for rollup */
  external: (string | RegExp)[]
  /** Test environment (default: node) */
  testEnv?: 'happy-dom' | 'node'
  /** Coverage thresholds */
  coverage: {
    lines: number
    branches: number
    functions: number
    statements: number
  }
  /** Additional Vite plugins (beyond dts) */
  plugins?: Plugin[]
  /** Files/patterns to exclude from coverage */
  coverageExclude?: string[]
  /** Override dts options (e.g. tsconfigPath) */
  dtsOptions?: Record<string, unknown>
  /** Disable minification (default: undefined, only core sets this to false) */
  minify?: boolean
  /** Additional test config overrides */
  testOverrides?: Record<string, unknown>
}

function loadDtsPlugin() {
  const require = createRequire(join(process.cwd(), 'package.json'))
  const plugin = require('vite-plugin-dts')
  return plugin.default ?? plugin
}

function createTestAliases(cwd: string) {
  const packagesDir = join(cwd, '..')
  const entry = (pkg: string, file: string) => join(packagesDir, pkg, 'src', file)

  return [
    { find: /^@fluenti\/core\/runtime$/, replacement: entry('core', 'runtime.ts') },
    { find: /^@fluenti\/core\/compiler$/, replacement: entry('core', 'compiler.ts') },
    { find: /^@fluenti\/core\/transform\/browser$/, replacement: entry('core', 'transform-browser.ts') },
    { find: /^@fluenti\/core\/transform$/, replacement: entry('core', 'transform.ts') },
    { find: /^@fluenti\/core\/ssr$/, replacement: entry('core', 'ssr-entry.ts') },
    { find: /^@fluenti\/core\/formatters$/, replacement: entry('core', 'formatters-entry.ts') },
    { find: /^@fluenti\/core\/config$/, replacement: entry('core', 'config.ts') },
    { find: /^@fluenti\/core$/, replacement: entry('core', 'index.ts') },
    { find: /^@fluenti\/react\/components$/, replacement: entry('react', 'components-entry.ts') },
    { find: /^@fluenti\/react\/server$/, replacement: entry('react', 'server.ts') },
    { find: /^@fluenti\/react\/vite-plugin$/, replacement: entry('react', 'vite-plugin.ts') },
    { find: /^@fluenti\/react$/, replacement: entry('react', 'index.ts') },
    { find: /^@fluenti\/vue\/components$/, replacement: entry('vue', 'components-entry.ts') },
    { find: /^@fluenti\/vue\/server$/, replacement: entry('vue', 'server.ts') },
    { find: /^@fluenti\/vue\/vite-plugin$/, replacement: entry('vue', 'vite-plugin.ts') },
    { find: /^@fluenti\/vue$/, replacement: entry('vue', 'index.ts') },
    { find: /^@fluenti\/solid\/components$/, replacement: entry('solid', 'components-entry.ts') },
    { find: /^@fluenti\/solid\/server$/, replacement: entry('solid', 'server.ts') },
    { find: /^@fluenti\/solid\/vite-plugin$/, replacement: entry('solid', 'vite-plugin.ts') },
    { find: /^@fluenti\/solid$/, replacement: entry('solid', 'index.ts') },
    { find: /^@fluenti\/vite-plugin\/sfc-transform$/, replacement: entry('vite-plugin', 'sfc-transform.ts') },
    { find: /^@fluenti\/vite-plugin$/, replacement: entry('vite-plugin', 'index.ts') },
    { find: /^@fluenti\/next$/, replacement: entry('next-plugin', 'index.ts') },
  ]
}

export function createPackageConfig(options: PackageConfigOptions) {
  return defineConfig(async ({ command }) => {
    const plugins = [...(options.plugins ?? [])]

    if (command === 'build') {
      const dts = loadDtsPlugin()
      plugins.unshift(dts({ rollupTypes: false, ...options.dtsOptions }))
    }

    return {
      ...(command === 'build' ? {} : { resolve: { alias: createTestAliases(process.cwd()) } }),
      build: {
        lib: {
          entry: options.entry,
          formats: ['es', 'cjs'],
        },
        rollupOptions: {
          external: options.external,
        },
        sourcemap: true,
        emptyOutDir: true,
        ...(options.minify !== undefined ? { minify: options.minify } : {}),
      },
      plugins,
      test: {
        ...(options.testEnv ? { environment: options.testEnv } : {}),
        coverage: {
          provider: 'v8',
          reporter: ['text', 'lcov'],
          ...(options.coverageExclude ? { exclude: options.coverageExclude } : {}),
          thresholds: options.coverage,
        },
        ...options.testOverrides,
      },
    } satisfies UserConfig
  })
}
