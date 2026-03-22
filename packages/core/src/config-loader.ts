import { existsSync } from 'node:fs'
import { resolve, dirname, relative, isAbsolute } from 'node:path'
import type { FluentiBuildConfig } from './types'

const defaultConfig: FluentiBuildConfig = {
  sourceLocale: 'en',
  locales: ['en'],
  catalogDir: './locales',
  format: 'po',
  include: ['./src/**/*.{vue,tsx,jsx,ts,js}'],
  exclude: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/*.d.ts'],
  compileOutDir: './src/locales/compiled',
  devAutoCompile: true,
  buildAutoCompile: true,
  devAutoCompileDelay: 500,
  parallelCompile: false,
  catalogExtension: '.js',
}

const MAX_EXTENDS_DEPTH = 10
const PATH_FIELDS = ['catalogDir', 'compileOutDir'] as const
const GLOB_FIELDS = ['include', 'exclude'] as const

/**
 * Rebase a relative path from one directory context to another.
 */
function rebase(relativePath: string, fromDir: string, toDir: string): string {
  const abs = resolve(fromDir, relativePath)
  return relative(toDir, abs) || '.'
}

/**
 * Rebase path-semantic fields in a config from parent directory to child directory.
 */
function rebasePaths(
  config: Partial<FluentiBuildConfig>,
  fromDir: string,
  toDir: string,
): Partial<FluentiBuildConfig> {
  const result = { ...config }
  for (const field of PATH_FIELDS) {
    if (result[field] && !isAbsolute(result[field]!)) {
      result[field] = rebase(result[field]!, fromDir, toDir)
    }
  }
  for (const field of GLOB_FIELDS) {
    if (result[field]) {
      result[field] = result[field]!.map(p => isAbsolute(p) ? p : rebase(p, fromDir, toDir))
    }
  }
  return result
}

/**
 * Find a config file path from candidates.
 */
function findConfigFile(configPath: string | undefined, base: string): string | undefined {
  const paths = configPath
    ? [resolve(base, configPath)]
    : [
        resolve(base, 'fluenti.config.ts'),
        resolve(base, 'fluenti.config.js'),
        resolve(base, 'fluenti.config.mjs'),
      ]

  for (const p of paths) {
    if (existsSync(p)) return p
  }
  return undefined
}

/**
 * Load Fluenti config from `fluenti.config.ts` (or `.js` / `.mjs`).
 *
 * When `cwd` is provided, config paths are resolved relative to it.
 * Supports `extends` to inherit from a parent config file.
 * Returns a fully merged config with defaults applied.
 *
 * @param configPath - Explicit path to config file (optional)
 * @param cwd - Working directory for auto-discovery (defaults to `process.cwd()`)
 */
export async function loadConfig(configPath?: string, cwd?: string): Promise<FluentiBuildConfig> {
  const base = cwd ?? process.cwd()
  const configFilePath = findConfigFile(configPath, base)

  if (!configFilePath) return { ...defaultConfig }

  const { createJiti } = await import('jiti')
  const jiti = createJiti(import.meta.url)

  return resolveConfigChain(configFilePath, jiti, new Set())
}

async function resolveConfigChain(
  configFilePath: string,
  jiti: { import: (path: string) => Promise<unknown> },
  visited: Set<string>,
): Promise<FluentiBuildConfig> {
  const absolutePath = resolve(configFilePath)

  if (visited.has(absolutePath)) {
    const chain = [...visited, absolutePath].join(' → ')
    throw new Error(`Circular extends detected: ${chain}`)
  }
  if (visited.size >= MAX_EXTENDS_DEPTH) {
    throw new Error(`Config extends chain exceeds maximum depth of ${MAX_EXTENDS_DEPTH}`)
  }

  visited.add(absolutePath)

  const mod = await jiti.import(absolutePath) as { default?: Partial<FluentiBuildConfig> }
  const userConfig = mod.default ?? mod as unknown as Partial<FluentiBuildConfig>

  if (!userConfig.extends) {
    const { extends: _extends, ...rest } = userConfig
    return { ...defaultConfig, ...rest }
  }

  const configDir = dirname(absolutePath)
  const parentPath = resolve(configDir, userConfig.extends)

  if (!existsSync(parentPath)) {
    throw new Error(`Config extends "${userConfig.extends}" but file not found: ${parentPath}`)
  }

  const parentConfig = await resolveConfigChain(parentPath, jiti, new Set(visited))

  const parentDir = dirname(parentPath)
  const childDir = configDir

  // Rebase parent paths to be relative to child config directory
  const rebasedParent = rebasePaths(parentConfig, parentDir, childDir)

  // Child overrides parent; remove extends from result
  const { extends: _extends, ...childRest } = userConfig
  const merged = { ...defaultConfig, ...rebasedParent, ...childRest }

  return merged
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
export function loadConfigSync(configPath?: string, cwd?: string): FluentiBuildConfig {
  const base = cwd ?? process.cwd()
  const configFilePath = findConfigFile(configPath, base)

  if (!configFilePath) return { ...defaultConfig }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createJiti } = require('jiti') as {
      createJiti: (
        url: string,
        options?: { moduleCache?: boolean; interopDefault?: boolean },
      ) => (path: string) => unknown
    }

    return resolveConfigChainSync(configFilePath, createJiti, new Set())
  } catch (err) {
    if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] !== 'production') {
      console.warn('[fluenti] Failed to load config, using defaults:', err)
    }
    return { ...defaultConfig }
  }
}

function resolveConfigChainSync(
  configFilePath: string,
  createJiti: (
    url: string,
    options?: { moduleCache?: boolean; interopDefault?: boolean },
  ) => (path: string) => unknown,
  visited: Set<string>,
): FluentiBuildConfig {
  const absolutePath = resolve(configFilePath)

  if (visited.has(absolutePath)) {
    const chain = [...visited, absolutePath].join(' → ')
    throw new Error(`Circular extends detected: ${chain}`)
  }
  if (visited.size >= MAX_EXTENDS_DEPTH) {
    throw new Error(`Config extends chain exceeds maximum depth of ${MAX_EXTENDS_DEPTH}`)
  }

  visited.add(absolutePath)

  const jiti = createJiti(absolutePath, {
    moduleCache: false,
    interopDefault: true,
  })
  const mod = jiti(absolutePath) as FluentiBuildConfig | { default?: FluentiBuildConfig }
  const userConfig = typeof mod === 'object' && mod !== null && 'default' in mod
    ? (mod.default ?? {}) as Partial<FluentiBuildConfig>
    : mod as Partial<FluentiBuildConfig>

  if (!userConfig.extends) {
    const { extends: _extends, ...rest } = userConfig
    return { ...defaultConfig, ...rest }
  }

  const configDir = dirname(absolutePath)
  const parentPath = resolve(configDir, userConfig.extends)

  if (!existsSync(parentPath)) {
    throw new Error(`Config extends "${userConfig.extends}" but file not found: ${parentPath}`)
  }

  const parentConfig = resolveConfigChainSync(parentPath, createJiti, new Set(visited))

  const parentDir = dirname(parentPath)
  const childDir = configDir

  const rebasedParent = rebasePaths(parentConfig, parentDir, childDir)

  const { extends: _extends, ...childRest } = userConfig
  return { ...defaultConfig, ...rebasedParent, ...childRest }
}

/** Default config values (exported for testing and reference) */
export { defaultConfig as DEFAULT_FLUENTI_CONFIG }
