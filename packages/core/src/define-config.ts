import type { FluentiBuildConfig } from './types'

/**
 * Define a Fluenti configuration with full type inference and IDE autocompletion.
 *
 * Can be imported from `@fluenti/core`, `@fluenti/core/config`, or `@fluenti/cli`.
 *
 * @example
 * ```ts
 * // fluenti.config.ts
 * import { defineConfig } from '@fluenti/core'
 *
 * export default defineConfig({
 *   sourceLocale: 'en',
 *   locales: ['en', 'ja', 'zh-CN'],
 *   catalogDir: './locales',
 *   format: 'po',
 *   include: ['./src/**\/*.{vue,tsx,ts}'],
 *   compileOutDir: './src/locales/compiled',
 * })
 * ```
 */
export function defineConfig(config: Partial<FluentiBuildConfig>): Partial<FluentiBuildConfig> {
  return config
}
