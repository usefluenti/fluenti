import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, extname, join, resolve } from 'node:path'
import type { FluentiConfig } from '@fluenti/core'
import type { WithFluentConfig, ResolvedFluentConfig } from './types'

const runtimeModulePath = typeof __filename === 'string'
  ? __filename
  : import.meta.url
const require = createRequire(runtimeModulePath)
const { createJiti } = require('jiti') as {
  createJiti: (
    url: string,
    options?: { moduleCache?: boolean; interopDefault?: boolean },
  ) => (path: string) => unknown
}

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

  const cookieName = overrides?.cookieName ?? 'locale'

  const resolved: ResolvedFluentConfig = {
    locales,
    defaultLocale,
    compiledDir,
    serverModule: overrides?.serverModule ?? null,
    serverModuleOutDir,
    cookieName,
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
  const jiti = createJiti(runtimeModulePath, {
    moduleCache: false,
    interopDefault: true,
  })
  const candidates = [
    'fluenti.config.ts',
    'fluenti.config.js',
    'fluenti.config.mjs',
  ]

  for (const name of candidates) {
    const configPath = resolve(projectRoot, name)
    if (existsSync(configPath)) {
      try {
        return normalizeLoadedConfig(jiti(configPath) as FluentiConfig | { default?: FluentiConfig })
      } catch {
        const rewritten = tryLoadConfigViaDefineConfigShim(configPath, jiti)
        if (rewritten) {
          return rewritten
        }
        return null
      }
    }
  }

  return null
}

function tryLoadConfigViaDefineConfigShim(
  configPath: string,
  jiti: (path: string) => unknown,
): FluentiConfig | null {
  const source = readFileSync(configPath, 'utf8')
  const importMatch = source.match(
    /import\s*\{\s*defineConfig(?:\s+as\s+([A-Za-z_$][\w$]*))?\s*\}\s*from\s*['"]@fluenti\/cli['"]\s*;?/,
  )
  if (!importMatch) {
    return null
  }

  const helperName = importMatch[1] ?? 'defineConfig'
  const rewrittenSource = source.replace(importMatch[0], '')
  const tempPath = join(
    dirname(configPath),
    `.${basename(configPath, extname(configPath))}.next-plugin-read-config${extname(configPath) || '.ts'}`,
  )

  writeFileSync(tempPath, `const ${helperName} = (config) => config\n${rewrittenSource}`, 'utf8')

  try {
    return normalizeLoadedConfig(jiti(tempPath) as FluentiConfig | { default?: FluentiConfig })
  } catch {
    return null
  } finally {
    rmSync(tempPath, { force: true })
  }
}

function normalizeLoadedConfig(
  mod: FluentiConfig | { default?: FluentiConfig },
): FluentiConfig {
  return typeof mod === 'object' && mod !== null && 'default' in mod
    ? (mod.default ?? {}) as FluentiConfig
    : mod as FluentiConfig
}
