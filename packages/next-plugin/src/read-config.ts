import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import type { FluentiConfig } from '@fluenti/core'
import type { WithFluentConfig, ResolvedFluentConfig } from './types'

/**
 * Read fluenti.config.ts and merge with withFluenti() overrides.
 */
export function resolveConfig(
  projectRoot: string,
  overrides?: WithFluentConfig,
): ResolvedFluentConfig {
  const fileConfig = readFluentConfigSync(projectRoot)

  const defaultLocale = overrides?.defaultLocale
    ?? fileConfig?.sourceLocale
    ?? 'en'

  const locales = overrides?.locales
    ?? fileConfig?.locales
    ?? [defaultLocale]

  const compiledDir = overrides?.compiledDir
    ?? fileConfig?.compileOutDir
    ?? './src/locales/compiled'

  const serverModuleOutDir = overrides?.serverModuleOutDir
    ?? join('node_modules', '.fluenti')

  const resolved: ResolvedFluentConfig = {
    locales,
    defaultLocale,
    compiledDir,
    serverModule: overrides?.serverModule ?? null,
    serverModuleOutDir,
  }
  if (overrides?.resolveLocale) resolved.resolveLocale = overrides.resolveLocale
  if (overrides?.dateFormats) resolved.dateFormats = overrides.dateFormats
  if (overrides?.numberFormats) resolved.numberFormats = overrides.numberFormats
  if (overrides?.fallbackChain) resolved.fallbackChain = overrides.fallbackChain
  return resolved
}

/**
 * Attempt to read fluenti.config.ts synchronously.
 * Returns null if file doesn't exist or can't be parsed.
 */
function readFluentConfigSync(projectRoot: string): FluentiConfig | null {
  const candidates = [
    'fluenti.config.ts',
    'fluenti.config.js',
    'fluenti.config.mjs',
  ]

  for (const name of candidates) {
    const configPath = resolve(projectRoot, name)
    if (existsSync(configPath)) {
      try {
        // We can't import TS at webpack config time,
        // but Next.js transpiles config files for us.
        // At webpack plugin time, we re-read with require().
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require(configPath)
        return (mod.default ?? mod) as FluentiConfig
      } catch {
        // Config file exists but can't be loaded synchronously.
        // This is OK — the user can pass all config via withFluenti().
        return null
      }
    }
  }

  return null
}
