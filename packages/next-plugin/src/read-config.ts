import { loadConfigSync } from '@fluenti/core/config'
import type { WithFluentConfig, ResolvedFluentConfig } from './types'

/**
 * Read fluenti.config.ts and merge with withFluenti() overrides.
 *
 * Delegates config file loading to `@fluenti/core`'s shared `loadConfigSync()`.
 */
export function resolveConfig(
  projectRoot: string,
  overrides?: WithFluentConfig,
): ResolvedFluentConfig {
  const fileConfig = loadConfigSync(undefined, projectRoot)

  // Support both field names: sourceLocale (canonical) and defaultLocale (legacy)
  const defaultLocale = overrides?.defaultLocale
    ?? overrides?.sourceLocale
    ?? fileConfig?.sourceLocale
    ?? 'en'

  const locales = overrides?.locales
    ?? fileConfig?.locales
    ?? [defaultLocale]

  // Support both field names: compileOutDir (canonical) and compiledDir (legacy)
  const compiledDir = overrides?.compiledDir
    ?? overrides?.compileOutDir
    ?? fileConfig?.compileOutDir
    ?? './src/locales/compiled'

  const serverModuleOutDir = overrides?.serverModuleOutDir ?? '.fluenti'

  const cookieName = overrides?.cookieName ?? 'locale'

  const resolved: ResolvedFluentConfig = {
    locales,
    defaultLocale,
    compiledDir,
    serverModule: overrides?.serverModule ?? null,
    serverModuleOutDir,
    cookieName,
  }
  const include = fileConfig?.include as string[] | undefined
  if (include) resolved.include = include
  if (overrides?.resolveLocale) resolved.resolveLocale = overrides.resolveLocale
  if (overrides?.dateFormats) resolved.dateFormats = overrides.dateFormats
  if (overrides?.numberFormats) resolved.numberFormats = overrides.numberFormats
  const fallbackChain = overrides?.fallbackChain ?? fileConfig?.fallbackChain
  if (fallbackChain) {
    resolved.fallbackChain = fallbackChain
  }
  return resolved
}
