import type { FluentiBuildConfig } from '@fluenti/core'

/**
 * Define a Fluenti configuration with full type inference and IDE autocompletion.
 *
 * @example
 * ```ts
 * // fluenti.config.ts
 * import { defineConfig } from '@fluenti/cli'
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
