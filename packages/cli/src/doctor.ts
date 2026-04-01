import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import fg from 'fast-glob'
import { detectFramework, type DetectedFramework } from './init'
import { loadConfig } from './config-loader'

export type DoctorSeverity = 'error' | 'warning' | 'info'

export interface DoctorFinding {
  severity: DoctorSeverity
  code: string
  message: string
}

export interface DoctorReport {
  framework: DetectedFramework['name']
  findings: DoctorFinding[]
  configPath?: string
}

export interface DoctorOptions {
  cwd: string
  config?: string
}

const SOURCE_GLOBS = [
  'src/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,vue,mdx}',
  'app/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,vue,mdx}',
  'pages/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,vue,mdx}',
  'components/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,vue,mdx}',
  'layouts/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,vue,mdx}',
]

const MAIN_INTERPOLATE_IMPORT_RE = /import\s*\{[\s\S]*?\binterpolate\b[\s\S]*?\}\s*from\s*['"]@fluenti\/(react|vue|solid)(?:\/components)?['"]/g
const INTERNAL_IMPORT_RE = /from\s*['"]@fluenti\/core\/internal['"]/g

function readIfExists(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, 'utf-8') : undefined
}

function detectConfigPath(cwd: string, explicit?: string): string | undefined {
  if (explicit) return resolve(cwd, explicit)

  for (const candidate of ['fluenti.config.ts', 'fluenti.config.mts', 'fluenti.config.js', 'fluenti.config.mjs']) {
    const resolved = resolve(cwd, candidate)
    if (existsSync(resolved)) return resolved
  }

  return undefined
}

async function collectSourceFiles(cwd: string): Promise<string[]> {
  return fg(SOURCE_GLOBS, {
    cwd,
    absolute: false,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.fluenti/**'],
  })
}

function pushFinding(findings: DoctorFinding[], severity: DoctorSeverity, code: string, message: string): void {
  findings.push({ severity, code, message })
}

function getPackageJson(cwd: string): { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | undefined {
  const pkgPath = resolve(cwd, 'package.json')
  const content = readIfExists(pkgPath)
  if (!content) return undefined
  return JSON.parse(content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
}

function hasVitePlugin(content: string | undefined): boolean {
  if (!content) return false
  return content.includes('@fluenti/') && content.includes('vite-plugin')
}

function countMatches(content: string, pattern: RegExp): number {
  return [...content.matchAll(pattern)].length
}

export async function runDoctor(options: DoctorOptions): Promise<DoctorReport> {
  const findings: DoctorFinding[] = []
  const pkg = getPackageJson(options.cwd)

  if (!pkg) {
    return {
      framework: 'unknown',
      findings: [{ severity: 'error', code: 'missing-package-json', message: 'No package.json found in the current directory.' }],
    }
  }

  const framework = detectFramework({ ...pkg.dependencies, ...pkg.devDependencies })
  const configPath = detectConfigPath(options.cwd, options.config)
  const files = await collectSourceFiles(options.cwd)

  let mainInterpolateImports = 0
  let internalImports = 0
  let importsFluenti = false
  let usesCompileTimeT = false

  for (const file of files) {
    const content = readFileSync(resolve(options.cwd, file), 'utf-8')
    mainInterpolateImports += countMatches(content, MAIN_INTERPOLATE_IMPORT_RE)
    internalImports += countMatches(content, INTERNAL_IMPORT_RE)
    importsFluenti = importsFluenti || content.includes('@fluenti/')
    usesCompileTimeT = usesCompileTimeT || content.includes("from '@fluenti/") && content.includes(' t`')
  }

  if (mainInterpolateImports > 0) {
    pushFinding(
      findings,
      'warning',
      'main-entry-interpolate',
      `Found ${mainInterpolateImports} import(s) of interpolate from framework packages. Import interpolate from @fluenti/core/runtime instead.`,
    )
  }

  if (internalImports > 0) {
    pushFinding(
      findings,
      'warning',
      'core-internal-imports',
      `Found ${internalImports} import(s) from @fluenti/core/internal. Use @fluenti/core/runtime or @fluenti/core/compiler.`,
    )
  }

  if (!configPath) {
    pushFinding(findings, 'warning', 'missing-config', 'No fluenti.config.* file found.')
  }

  if (framework.name === 'nextjs') {
    const nextConfig = ['next.config.ts', 'next.config.mjs', 'next.config.js']
      .map((name) => resolve(options.cwd, name))
      .find((candidate) => existsSync(candidate))
    const nextContent = nextConfig ? readIfExists(nextConfig) : undefined
    if (importsFluenti && !nextContent?.includes('withFluenti(')) {
      pushFinding(findings, 'error', 'missing-with-fluenti', 'Next.js project imports Fluenti but next.config does not call withFluenti().')
    }
  }

  if (framework.name === 'react' || framework.name === 'vue' || framework.name === 'solid') {
    const viteConfig = ['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs']
      .map((name) => resolve(options.cwd, name))
      .find((candidate) => existsSync(candidate))
    const viteContent = viteConfig ? readIfExists(viteConfig) : undefined
    if ((importsFluenti || usesCompileTimeT) && !hasVitePlugin(viteContent)) {
      pushFinding(findings, 'warning', 'missing-vite-plugin', 'Project imports Fluenti but vite.config does not appear to include a Fluenti Vite plugin.')
    }
  }

  if (configPath && existsSync(configPath)) {
    try {
      const config = await loadConfig(configPath)
      const sourceCatalogExt = config.format === 'json' ? '.json' : '.po'
      const sourceCatalog = resolve(options.cwd, config.catalogDir, `${config.sourceLocale}${sourceCatalogExt}`)
      if (!existsSync(sourceCatalog)) {
        pushFinding(findings, 'warning', 'missing-source-catalog', `Source catalog not found: ${sourceCatalog}`)
      }

      const compiledIndex = resolve(options.cwd, config.compileOutDir, 'index.js')
      if (!existsSync(compiledIndex)) {
        pushFinding(findings, 'warning', 'missing-compiled-catalogs', `Compiled catalogs not found at ${compiledIndex}. Run "fluenti compile".`)
      }
    } catch (error) {
      pushFinding(
        findings,
        'error',
        'invalid-config',
        `Failed to load Fluenti config: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  if (findings.length === 0) {
    pushFinding(findings, 'info', 'ok', 'No Fluenti migration or configuration issues detected.')
  }

  return {
    framework: framework.name,
    findings,
    ...(configPath ? { configPath } : {}),
  }
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines: string[] = [`Framework: ${report.framework}`]
  if (report.configPath) {
    lines.push(`Config: ${report.configPath}`)
  }
  lines.push('')

  for (const finding of report.findings) {
    const prefix = finding.severity === 'error'
      ? '✖'
      : finding.severity === 'warning'
        ? '⚠'
        : '•'
    lines.push(`${prefix} [${finding.code}] ${finding.message}`)
  }

  return lines.join('\n')
}
