import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { FluentiConfig } from './types'

const defaultConfig: FluentiConfig = {
  sourceLocale: 'en',
  locales: ['en'],
  catalogDir: './locales',
  format: 'po',
  include: ['./src/**/*.{vue,tsx,jsx,ts,js}'],
  compileOutDir: './src/locales/compiled',
}

/**
 * Load Fluenti config from `fluenti.config.ts` (or `.js` / `.mjs`).
 *
 * When `cwd` is provided, config paths are resolved relative to it.
 * Returns a fully merged config with defaults applied.
 *
 * @param configPath - Explicit path to config file (optional)
 * @param cwd - Working directory for auto-discovery (defaults to `process.cwd()`)
 */
export async function loadConfig(configPath?: string, cwd?: string): Promise<FluentiConfig> {
  const base = cwd ?? process.cwd()
  const paths = configPath
    ? [resolve(base, configPath)]
    : [
        resolve(base, 'fluenti.config.ts'),
        resolve(base, 'fluenti.config.js'),
        resolve(base, 'fluenti.config.mjs'),
      ]

  for (const p of paths) {
    if (existsSync(p)) {
      const { createJiti } = await import('jiti')
      const jiti = createJiti(import.meta.url)
      const mod = await jiti.import(p) as { default?: Partial<FluentiConfig> }
      const userConfig = mod.default ?? mod as unknown as Partial<FluentiConfig>
      return { ...defaultConfig, ...userConfig }
    }
  }

  return defaultConfig
}

/**
 * Load Fluenti config synchronously using jiti's require-based loading.
 *
 * Useful in contexts where async is not available (e.g., webpack config).
 * Falls back to defaults if no config file is found.
 *
 * @param configPath - Explicit path to config file (optional)
 * @param cwd - Working directory for auto-discovery (defaults to `process.cwd()`)
 */
export function loadConfigSync(configPath?: string, cwd?: string): FluentiConfig {
  const base = cwd ?? process.cwd()
  const paths = configPath
    ? [resolve(base, configPath)]
    : [
        resolve(base, 'fluenti.config.ts'),
        resolve(base, 'fluenti.config.js'),
        resolve(base, 'fluenti.config.mjs'),
      ]

  for (const p of paths) {
    if (existsSync(p)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createJiti } = require('jiti') as {
          createJiti: (
            url: string,
            options?: { moduleCache?: boolean; interopDefault?: boolean },
          ) => (path: string) => unknown
        }
        const jiti = createJiti(p, {
          moduleCache: false,
          interopDefault: true,
        })
        const mod = jiti(p) as FluentiConfig | { default?: FluentiConfig }
        const userConfig = typeof mod === 'object' && mod !== null && 'default' in mod
          ? (mod.default ?? {}) as Partial<FluentiConfig>
          : mod as Partial<FluentiConfig>
        return { ...defaultConfig, ...userConfig }
      } catch {
        // Config file exists but couldn't be loaded — return defaults
        return defaultConfig
      }
    }
  }

  return defaultConfig
}

/** Default config values (exported for testing and reference) */
export { defaultConfig as DEFAULT_FLUENTI_CONFIG }
