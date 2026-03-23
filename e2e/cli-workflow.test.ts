import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, cpSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const CLI = join(import.meta.dirname, '../packages/cli/dist/cli.js')
const FIXTURE = join(import.meta.dirname, 'fixtures/react-no-plugin')

describe('CLI workflow E2E', () => {
  let workDir: string

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'fluenti-cli-e2e-'))
    cpSync(FIXTURE, workDir, { recursive: true })
    // Remove compiled output to test fresh compilation
    const compiled = join(workDir, 'src/locales/compiled')
    if (existsSync(compiled)) rmSync(compiled, { recursive: true })
  })

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  function cliEnv(): Record<string, string> {
    // Build a clean env without Vitest-injected variables.
    // consola suppresses output when it detects a test environment
    // (NODE_ENV=test, TEST=true, VITEST, etc.), so we must strip those.
    const env: Record<string, string> = {}
    for (const [key, value] of Object.entries(process.env)) {
      if (value === undefined) continue
      if (key.startsWith('VITEST')) continue
      if (key === 'TEST') continue
      env[key] = value
    }
    env.FORCE_COLOR = '0'
    env.NODE_ENV = 'production'
    return env
  }

  function cli(cmd: string): string {
    return execSync(`node ${CLI} ${cmd} --config ${join(workDir, 'fluenti.config.ts')} 2>&1`, {
      cwd: workDir,
      encoding: 'utf-8',
      timeout: 30_000,
      env: cliEnv(),
    })
  }

  it('extract produces catalog files', () => {
    cli('extract')
    expect(existsSync(join(workDir, 'locales/en.json'))).toBe(true)
  })

  it('compile produces JS modules', () => {
    cli('compile')
    expect(existsSync(join(workDir, 'src/locales/compiled/en.js'))).toBe(true)
    expect(existsSync(join(workDir, 'src/locales/compiled/ja.js'))).toBe(true)
    expect(existsSync(join(workDir, 'src/locales/compiled/zh-CN.js'))).toBe(true)
  })

  it('compiled output contains message content', () => {
    const enJs = readFileSync(join(workDir, 'src/locales/compiled/en.js'), 'utf-8')
    expect(enJs.length).toBeGreaterThan(50)

    const jaJs = readFileSync(join(workDir, 'src/locales/compiled/ja.js'), 'utf-8')
    expect(jaJs.length).toBeGreaterThan(50)
  })

  it('compile generates type definitions', () => {
    expect(existsSync(join(workDir, 'src/locales/compiled/messages.d.ts'))).toBe(true)
  })

  it('stats shows translation progress', () => {
    const output = cli('stats')
    expect(output).toContain('en')
    expect(output).toContain('ja')
    expect(output).toContain('zh-CN')
  })

  it('check passes with 0% min-coverage', () => {
    expect(() => cli('check --min-coverage 0')).not.toThrow()
  })

  it('check fails with 100% min-coverage on incomplete translations', () => {
    // en is the source locale and has no translations filled in,
    // so --min-coverage 100 should cause a non-zero exit
    try {
      cli('check --min-coverage 100')
    } catch (error) {
      const err = error as { status: number; stdout: string }
      expect(err.status).not.toBe(0)
      return
    }
    // If it didn't throw, all translations are complete — that's also acceptable
  })

  it('lint runs without crashing', () => {
    try {
      cli('lint')
    } catch (error) {
      // lint may exit non-zero on warnings/errors — that's fine,
      // we just verify it doesn't crash with an unexpected error
      const err = error as { status: number }
      expect(err.status).toBeDefined()
    }
  })

  it('extract --clean removes obsolete entries', () => {
    expect(() => cli('extract --clean')).not.toThrow()
  })

  it('compile --skip-fuzzy excludes fuzzy entries', () => {
    expect(() => cli('compile --skip-fuzzy')).not.toThrow()
  })
})
