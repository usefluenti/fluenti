/**
 * Shared Vite config factory for all Fluenti packages.
 *
 * Eliminates ~30 lines of duplicated config per package by extracting
 * the common build/test patterns into a single parameterized function.
 */
import { defineConfig, type UserConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'
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

export function createPackageConfig(options: PackageConfigOptions): UserConfig {
  return defineConfig({
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
    plugins: [
      dts({ rollupTypes: false, ...options.dtsOptions }),
      ...(options.plugins ?? []),
    ],
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
  }) as UserConfig
}
