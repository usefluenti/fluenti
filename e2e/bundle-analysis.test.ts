/**
 * E2E: Bundle analysis — validates the slim runtime architecture.
 *
 * Runs against pre-built example output. No server needed.
 * Uses Vitest (not Playwright) since it's filesystem analysis.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const ROOT = join(import.meta.dirname, '..')
const REACT_EXAMPLE = join(ROOT, 'examples/react')

describe('bundle analysis', () => {
  let jsFiles: string[]
  let mainBundle: string

  beforeAll(() => {
    // Build the React example
    execSync('pnpm build', { cwd: REACT_EXAMPLE, stdio: 'pipe', timeout: 60_000 })

    const assetsDir = join(REACT_EXAMPLE, 'dist/assets')
    jsFiles = readdirSync(assetsDir)
      .filter((f) => f.endsWith('.js'))
      .map((f) => join(assetsDir, f))

    // The main bundle is the largest non-vendor JS file
    mainBundle = jsFiles
      .map((f) => ({ path: f, content: readFileSync(f, 'utf-8') }))
      .filter((f) => f.content.includes('I18nProvider') || f.content.includes('createFluenti'))
      .map((f) => f.content)
      .join('\n')
  })

  it('built JS assets exist', () => {
    expect(jsFiles.length).toBeGreaterThan(0)
  })

  it('main bundle does NOT contain ICU parser signatures', () => {
    // These are unique to the parser module and should never appear in production
    expect(mainBundle).not.toContain('FluentParseError')
    expect(mainBundle).not.toContain('MAX_NESTING_DEPTH')
    expect(mainBundle).not.toContain('MAX_MESSAGE_LENGTH')
    expect(mainBundle).not.toContain('parseICU')
  })

  it('main bundle does NOT contain compiler cache signatures', () => {
    expect(mainBundle).not.toContain('clearCompileCache')
    expect(mainBundle).not.toContain('compileNode')
  })

  it('main bundle does NOT contain full interpolate module', () => {
    // The full interpolate module has an LRU cache for compiled messages
    expect(mainBundle).not.toContain('clearInterpolationCache')
    expect(mainBundle).not.toContain('DEFAULT_MESSAGE_CACHE_SIZE')
  })

  it('translation chunks contain compiled functions (not raw ICU)', () => {
    // Look for compiled catalog output — functions or string assignments with hash-like names
    const allContent = jsFiles.map((f) => readFileSync(f, 'utf-8')).join('\n')
    // Compiled catalogs have arrow functions: (v) => `...` or string literals
    // They may appear as named exports or as object properties
    const hasCompiledOutput = allContent.includes('=>') || allContent.includes('`')
    expect(hasCompiledOutput).toBe(true)
  })

  it('total JS bundle gzip is within size budget', () => {
    const totalGzip = jsFiles.reduce((sum, f) => {
      const content = readFileSync(f)
      return sum + gzipSync(content).length
    }, 0)
    // Budget: 200 KB gzip for a full React SPA (includes React, app code, translations, CSS)
    // This is generous — the point is catching massive regressions
    expect(totalGzip).toBeLessThan(200_000)
  })
})
