import { existsSync } from 'node:fs'
import { resolve, dirname, join, relative, isAbsolute } from 'node:path'
import { createRequire } from 'node:module'
import type { FluentiBuildConfig } from './types'
import { normalizeConfig } from './types'

const VALID_FORMATS = new Set(['po', 'json'])

// Module-level require that works in both CJS and ESM after bundling.
// Using createRequire() directly (rather than the `typeof require !== 'undefined'` guard)
// prevents Rolldown from rewriting bare `require` to its `__require` Proxy shim,
// which is always "defined" and causes the ESM fallback to never be reached.
// Pattern mirrors scope-codegen.ts.
const _moduleRequire = createRequire(
  typeof __filename !== 'undefined' ? __filename : import.meta.url,
)

const defaultConfig: FluentiBuildConfig = {
  sourceLocale: 'en',
  locales: ['en'],
  catalogDir: './locales',
  format: 'po',
  include: ['./src/**/*.{vue,tsx,jsx,ts,js,mts,mjs,cts,cjs}'],
  exclude: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/*.d.ts'],
  compileOutDir: './src/locales/compiled',
  devAutoCompile: true,
  buildAutoCompile: true,
  devAutoCompileDelay: 500,
}

const MAX_EXTENDS_DEPTH = 10
const PATH_FIELDS = ['catalogDir', 'compileOutDir'] as const
const GLOB_FIELDS = ['include', 'exclude'] as const

/**
 * Validate that an `extends` path is reasonable and not attempting to access
 * sensitive system paths. The `extends` value must be a relative path.
 */
function validateExtendsPath(extendsValue: string): void {
  if (isAbsolute(extendsValue)) {
    throw new Error(
      `Config "extends" must be a relative path, got absolute path: "${extendsValue}"`,
    )
  }
}

/**
 * Validate that a resolved extends path does not escape the project root.
 * Prevents path traversal attacks like `extends: "../../../../etc/shadow"`.
 */
function validateResolvedExtendsPath(
  resolvedPath: string,
  projectRoot: string,
  rawValue: string,
): void {
  const normalized = resolve(resolvedPath)
  const root = resolve(projectRoot)
  if (normalized !== root && !normalized.startsWith(root + '/')) {
    throw new Error(
      `Config "extends" resolves to "${normalized}" which is outside project root "${root}" (raw: "${rawValue}")`,
    )
  }
}

/**
 * Validate the basic shape of a user-provided config object.
 * Throws descriptive errors for invalid values.
 */
function validateConfigShape(config: Partial<FluentiBuildConfig>, configFilePath: string): void {
  if ('sourceLocale' in config) {
    if (typeof config.sourceLocale !== 'string' || config.sourceLocale.trim() === '') {
      throw new Error(
        `Invalid "sourceLocale" in ${configFilePath}: must be a non-empty string, got ${JSON.stringify(config.sourceLocale)}`,
      )
    }
  }
  if ('locales' in config) {
    if (!Array.isArray(config.locales) || config.locales.length === 0) {
      throw new Error(
        `Invalid "locales" in ${configFilePath}: must be a non-empty array, got ${JSON.stringify(config.locales)}`,
      )
    }
  }
  if ('format' in config && config.format !== undefined) {
    if (!VALID_FORMATS.has(config.format as string)) {
      throw new Error(
        `Invalid "format" in ${configFilePath}: must be "po" or "json", got ${JSON.stringify(config.format)}`,
      )
    }
  }
  if ('extends' in config && config.extends !== undefined) {
    if (typeof config.extends !== 'string' || config.extends.trim() === '') {
      throw new Error(
        `Invalid "extends" in ${configFilePath}: must be a non-empty string, got ${JSON.stringify(config.extends)}`,
      )
    }
  }
}

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
 * Infer the widest sensible project root for config security checks.
 *
 * Priority:
 * 1. Nearest workspace/repo marker above the config (`pnpm-workspace.yaml` or `.git`)
 * 2. Nearest ancestor package root (`package.json`)
 * 3. Fallback root passed by the caller
 */
function findProjectRoot(startDir: string, fallbackRoot: string): string {
  let current = resolve(startDir)
  let nearestPackageRoot: string | undefined

  while (true) {
    if (existsSync(join(current, 'pnpm-workspace.yaml')) || existsSync(join(current, '.git'))) {
      return current
    }

    if (!nearestPackageRoot && existsSync(join(current, 'package.json'))) {
      nearestPackageRoot = current
    }

    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }

  return nearestPackageRoot ?? resolve(fallbackRoot)
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

  if (!configFilePath) return normalizeConfig({ ...defaultConfig })

  const { createJiti } = await import('jiti')
  const jiti = createJiti(typeof __filename !== 'undefined' ? __filename : import.meta.url)

  const projectRoot = findProjectRoot(dirname(configFilePath), base)
  const resolved = await resolveConfigChain(configFilePath, jiti, new Set(), projectRoot)
  return normalizeConfig(resolved)
}

async function resolveConfigChain(
  configFilePath: string,
  jiti: { import: (path: string) => Promise<unknown> },
  visited: Set<string>,
  projectRoot: string,
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

  if (typeof userConfig !== 'object' || userConfig === null || Array.isArray(userConfig)) {
    throw new Error(`Config file ${absolutePath} must export an object, got ${typeof userConfig}`)
  }
  validateConfigShape(userConfig, absolutePath)

  if (!userConfig.extends) {
    const { extends: _extends, ...rest } = userConfig
    return { ...defaultConfig, ...rest }
  }

  const configDir = dirname(absolutePath)
  validateExtendsPath(userConfig.extends)
  const parentPath = resolve(configDir, userConfig.extends)
  validateResolvedExtendsPath(parentPath, projectRoot, userConfig.extends)

  if (!existsSync(parentPath)) {
    throw new Error(`Config extends "${userConfig.extends}" but file not found: ${parentPath}`)
  }

  const parentConfig = await resolveConfigChain(parentPath, jiti, new Set(visited), projectRoot)

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

  if (!configFilePath) return normalizeConfig({ ...defaultConfig })

  const { createJiti } = _moduleRequire('jiti') as {
    createJiti: (
      url: string,
      options?: { moduleCache?: boolean; interopDefault?: boolean },
    ) => (path: string) => unknown
  }

  const projectRoot = findProjectRoot(dirname(configFilePath), base)
  const resolved = resolveConfigChainSync(configFilePath, createJiti, new Set(), projectRoot)
  return normalizeConfig(resolved)
}

function resolveConfigChainSync(
  configFilePath: string,
  createJiti: (
    url: string,
    options?: { moduleCache?: boolean; interopDefault?: boolean },
  ) => (path: string) => unknown,
  visited: Set<string>,
  projectRoot: string,
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

  if (typeof userConfig !== 'object' || userConfig === null || Array.isArray(userConfig)) {
    throw new Error(`Config file ${absolutePath} must export an object, got ${typeof userConfig}`)
  }
  validateConfigShape(userConfig, absolutePath)

  if (!userConfig.extends) {
    const { extends: _extends, ...rest } = userConfig
    return { ...defaultConfig, ...rest }
  }

  const configDir = dirname(absolutePath)
  validateExtendsPath(userConfig.extends)
  const parentPath = resolve(configDir, userConfig.extends)
  validateResolvedExtendsPath(parentPath, projectRoot, userConfig.extends)

  if (!existsSync(parentPath)) {
    throw new Error(`Config extends "${userConfig.extends}" but file not found: ${parentPath}`)
  }

  const parentConfig = resolveConfigChainSync(parentPath, createJiti, new Set(visited), projectRoot)

  const parentDir = dirname(parentPath)
  const childDir = configDir

  const rebasedParent = rebasePaths(parentConfig, parentDir, childDir)

  const { extends: _extends, ...childRest } = userConfig
  return { ...defaultConfig, ...rebasedParent, ...childRest }
}

/** Default config values (exported for testing and reference) */
export { defaultConfig as DEFAULT_FLUENTI_CONFIG }
