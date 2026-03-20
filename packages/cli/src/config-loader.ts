import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { FluentiConfig } from '@fluenti/core'

const defaultConfig: FluentiConfig = {
  sourceLocale: 'en',
  locales: ['en'],
  catalogDir: './locales',
  format: 'po',
  include: ['./src/**/*.{vue,tsx,jsx,ts,js}'],
  compileOutDir: './src/locales/compiled',
}

/**
 * Load Fluenti config from the given path or auto-discover it.
 * When `cwd` is provided, config paths are resolved relative to it.
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
