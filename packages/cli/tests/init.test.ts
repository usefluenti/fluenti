import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectFramework, generateFluentiConfig, validateLocale, runInit } from '../src/init'

describe('detectFramework', () => {
  it('detects Next.js', () => {
    expect(detectFramework({ next: '^15' })).toEqual({
      name: 'nextjs',
      pluginPackage: '@fluenti/next',
    })
  })

  it('detects Nuxt', () => {
    expect(detectFramework({ nuxt: '^3' })).toEqual({
      name: 'nuxt',
      pluginPackage: '@fluenti/vue',
    })
  })

  it('detects Vue', () => {
    expect(detectFramework({ vue: '^3' })).toEqual({
      name: 'vue',
      pluginPackage: '@fluenti/vue',
    })
  })

  it('detects SolidJS', () => {
    expect(detectFramework({ 'solid-js': '^1' })).toEqual({
      name: 'solid',
      pluginPackage: '@fluenti/solid',
    })
  })

  it('detects SolidStart', () => {
    expect(detectFramework({ '@solidjs/start': '^1' })).toEqual({
      name: 'solidstart',
      pluginPackage: '@fluenti/solid',
    })
  })

  it('detects React', () => {
    expect(detectFramework({ react: '^19' })).toEqual({
      name: 'react',
      pluginPackage: '@fluenti/react',
    })
  })

  it('returns unknown for empty deps', () => {
    expect(detectFramework({})).toEqual({
      name: 'unknown',
      pluginPackage: null,
    })
  })

  it('prioritizes Next.js over React', () => {
    expect(detectFramework({ next: '^15', react: '^19' })).toEqual({
      name: 'nextjs',
      pluginPackage: '@fluenti/next',
    })
  })

  it('prioritizes Nuxt over Vue', () => {
    expect(detectFramework({ nuxt: '^3', vue: '^3' })).toEqual({
      name: 'nuxt',
      pluginPackage: '@fluenti/vue',
    })
  })
})

describe('generateFluentiConfig', () => {
  it('generates config with defineConfig', () => {
    const config = generateFluentiConfig({
      sourceLocale: 'en',
      locales: ['en', 'ja', 'zh-CN'],
      format: 'po',
    })

    expect(config).toContain('defineConfig')
    expect(config).toContain("sourceLocale: 'en'")
    expect(config).toContain("'en', 'ja', 'zh-CN'")
    expect(config).toContain("format: 'po'")
  })

  it('generates config with json format', () => {
    const config = generateFluentiConfig({
      sourceLocale: 'en',
      locales: ['en', 'fr'],
      format: 'json',
    })

    expect(config).toContain("format: 'json'")
  })

  it('includes standard directory defaults', () => {
    const config = generateFluentiConfig({
      sourceLocale: 'en',
      locales: ['en'],
      format: 'po',
    })

    expect(config).toContain("catalogDir: './locales'")
    expect(config).toContain("compileOutDir: './src/locales/compiled'")
    expect(config).toContain("include: ['./src/**/*.{vue,tsx,jsx,ts,js}']")
  })
})

describe('validateLocale', () => {
  it('accepts valid BCP-47 locale tags', () => {
    expect(validateLocale('en')).toBe('en')
    expect(validateLocale('ja')).toBe('ja')
    expect(validateLocale('zh-CN')).toBe('zh-CN')
    expect(validateLocale('pt-BR')).toBe('pt-BR')
    expect(validateLocale('en-US')).toBe('en-US')
  })

  it('accepts three-letter language codes', () => {
    expect(validateLocale('yue')).toBe('yue')
    expect(validateLocale('yue-HK')).toBe('yue-HK')
  })

  it('rejects empty string', () => {
    expect(() => validateLocale('')).toThrow('Invalid locale format')
  })

  it('rejects strings with special characters', () => {
    expect(() => validateLocale("en'; DROP TABLE")).toThrow('Invalid locale format')
    expect(() => validateLocale('en/../../etc')).toThrow('Invalid locale format')
    expect(() => validateLocale('en\nmalicious')).toThrow('Invalid locale format')
  })

  it('rejects single character', () => {
    expect(() => validateLocale('e')).toThrow('Invalid locale format')
  })

  it('rejects overly long subtags', () => {
    expect(() => validateLocale('en-123456789')).toThrow('Invalid locale format')
  })
})

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
    readFileSync: vi.fn(actual.readFileSync),
    writeFileSync: vi.fn(actual.writeFileSync),
    appendFileSync: vi.fn(actual.appendFileSync),
  }
})

vi.mock('consola', async () => {
  const actual = await vi.importActual<typeof import('consola')>('consola')
  return {
    ...actual,
    default: {
      ...actual.default,
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      log: vi.fn(),
      box: vi.fn(),
      prompt: vi.fn(),
    },
  }
})

import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import consola from 'consola'

describe('runInit — edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles corrupt package.json with JSON.parse error', async () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue('not valid json {{{')

    await expect(runInit({ cwd: '/test' })).rejects.toThrow()
  })

  it('exits early when user cancels prompt (symbol)', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('package.json')) return true
      if (String(path).endsWith('fluenti.config.ts')) return false
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('{"dependencies":{}}')

    vi.mocked(consola.prompt).mockResolvedValueOnce(Symbol('cancel') as never)

    await runInit({ cwd: '/test' })

    // Should not have written any config file since prompt was cancelled
    expect(writeFileSync).not.toHaveBeenCalled()
  })

  it('validates locale format and rejects invalid target locale input', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('package.json')) return true
      if (String(path).endsWith('fluenti.config.ts')) return false
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('{"dependencies":{}}')

    vi.mocked(consola.prompt)
      .mockResolvedValueOnce('en' as never)         // sourceLocale
      .mockResolvedValueOnce('!!!bad' as never)      // targetLocales (invalid)
      .mockResolvedValueOnce('po' as never)          // format

    await expect(runInit({ cwd: '/test' })).rejects.toThrow('Invalid locale format')
  })

  it('handles file I/O error during gitignore append', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('package.json')) return true
      if (String(path).endsWith('fluenti.config.ts')) return false
      if (String(path).endsWith('.gitignore')) return true
      return false
    })
    vi.mocked(readFileSync).mockImplementation(((path: string) => {
      if (String(path).endsWith('package.json')) return '{"dependencies":{}}'
      if (String(path).endsWith('.gitignore')) return '# existing gitignore'
      return ''
    }) as typeof readFileSync)
    vi.mocked(writeFileSync).mockImplementation(() => {})
    vi.mocked(appendFileSync).mockImplementation(() => {
      throw new Error('EACCES: permission denied')
    })

    vi.mocked(consola.prompt)
      .mockResolvedValueOnce('en' as never)
      .mockResolvedValueOnce('ja' as never)
      .mockResolvedValueOnce('po' as never)

    await expect(runInit({ cwd: '/test' })).rejects.toThrow('EACCES')
  })
})
