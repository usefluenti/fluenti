import { loadConfigSync, DEFAULT_FLUENTI_CONFIG } from '@fluenti/core/config'
import type { FluentiBuildConfig } from '@fluenti/core'
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
  let fluentiConfig: FluentiBuildConfig

  if (overrides?.config && typeof overrides.config === 'object') {
    // Inline config — merge with defaults
    fluentiConfig = { ...DEFAULT_FLUENTI_CONFIG, ...overrides.config }
  } else {
    // string path or auto-discover
    fluentiConfig = loadConfigSync(
      typeof overrides?.config === 'string' ? overrides.config : undefined,
      projectRoot,
    )
  }

  const serverModuleOutDir = overrides?.serverModuleOutDir ?? '.fluenti'
  const cookieName = overrides?.cookieName ?? 'locale'

  const resolved: ResolvedFluentConfig = {
    fluentiConfig,
    serverModule: overrides?.serverModule ?? null,
    serverModuleOutDir,
    cookieName,
  }
  if (overrides?.resolveLocale) resolved.resolveLocale = overrides.resolveLocale
  return resolved
}
