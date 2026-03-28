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
    expect(config).toContain('sourceLocale: "en"')
    expect(config).toContain('"en", "ja", "zh-CN"')
    expect(config).toContain('format: "po"')
  })

  it('generates config with json format', () => {
    const config = generateFluentiConfig({
      sourceLocale: 'en',
      locales: ['en', 'fr'],
      format: 'json',
    })

    expect(config).toContain('format: "json"')
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

  it('returns early when no package.json found', async () => {
    vi.mocked(existsSync).mockReturnValue(false)

    await runInit({ cwd: '/test' })

    expect(consola.error).toHaveBeenCalledWith(expect.stringContaining('No package.json'))
    expect(writeFileSync).not.toHaveBeenCalled()
  })

  it('skips config generation when fluenti.config.ts already exists', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('package.json')) return true
      if (String(path).endsWith('fluenti.config.ts')) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('{"dependencies":{"vue":"^3"}}')

    await runInit({ cwd: '/test' })

    expect(consola.warn).toHaveBeenCalledWith(expect.stringContaining('already exists'))
    expect(writeFileSync).not.toHaveBeenCalled()
  })

  it('cancels on second prompt (target locales)', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('package.json')) return true
      if (String(path).endsWith('fluenti.config.ts')) return false
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('{"dependencies":{}}')

    vi.mocked(consola.prompt)
      .mockResolvedValueOnce('en' as never)
      .mockResolvedValueOnce(Symbol('cancel') as never)

    await runInit({ cwd: '/test' })

    expect(writeFileSync).not.toHaveBeenCalled()
  })

  it('cancels on third prompt (format)', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('package.json')) return true
      if (String(path).endsWith('fluenti.config.ts')) return false
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('{"dependencies":{}}')

    vi.mocked(consola.prompt)
      .mockResolvedValueOnce('en' as never)
      .mockResolvedValueOnce('ja,zh-CN' as never)
      .mockResolvedValueOnce(Symbol('cancel') as never)

    await runInit({ cwd: '/test' })

    expect(writeFileSync).not.toHaveBeenCalled()
  })

  it('completes full init flow with Vue framework', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('package.json')) return true
      if (String(path).endsWith('fluenti.config.ts')) return false
      if (String(path).endsWith('.gitignore')) return false
      return false
    })
    vi.mocked(readFileSync).mockImplementation(((path: string) => {
      if (String(path).endsWith('package.json')) {
        return '{"dependencies":{"vue":"^3.5"}}'
      }
      return ''
    }) as typeof readFileSync)
    vi.mocked(writeFileSync).mockImplementation(() => {})

    vi.mocked(consola.prompt)
      .mockResolvedValueOnce('en' as never)
      .mockResolvedValueOnce('ja,zh-CN' as never)
      .mockResolvedValueOnce('po' as never)

    await runInit({ cwd: '/test' })

    // Should write config file
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('fluenti.config.ts'),
      expect.stringContaining('defineConfig'),
      'utf-8',
    )
    // Should create .gitignore (since it didn't exist)
    const gitignoreCall = vi.mocked(writeFileSync).mock.calls.find(
      (c) => String(c[0]).endsWith('.gitignore'),
    )
    expect(gitignoreCall).toBeDefined()
    expect(String(gitignoreCall![1])).toContain('compiled')
    // Should add scripts to package.json
    const pkgCall = vi.mocked(writeFileSync).mock.calls.find(
      (c) => String(c[0]).endsWith('package.json'),
    )
    expect(pkgCall).toBeDefined()
    expect(String(pkgCall![1])).toContain('i18n:extract')
    // Should show next steps
    expect(consola.box).toHaveBeenCalled()
    // Should recommend @fluenti/vue
    expect(consola.info).toHaveBeenCalledWith(expect.stringContaining('@fluenti/vue'))
  })

  it('does not duplicate source locale in allLocales', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('package.json')) return true
      if (String(path).endsWith('fluenti.config.ts')) return false
      if (String(path).endsWith('.gitignore')) return false
      return false
    })
    vi.mocked(readFileSync).mockImplementation(((path: string) => {
      if (String(path).endsWith('package.json')) return '{"dependencies":{}}'
      return ''
    }) as typeof readFileSync)
    vi.mocked(writeFileSync).mockImplementation(() => {})

    vi.mocked(consola.prompt)
      .mockResolvedValueOnce('en' as never)
      .mockResolvedValueOnce('en,ja' as never)  // en duplicated
      .mockResolvedValueOnce('json' as never)

    await runInit({ cwd: '/test' })

    // Config should not have 'en' twice
    const configCall = vi.mocked(writeFileSync).mock.calls.find(
      (c) => String(c[0]).endsWith('fluenti.config.ts'),
    )
    expect(configCall).toBeDefined()
    const configContent = configCall![1] as string
    // Count occurrences of "en" in locales array
    const match = configContent.match(/locales: \[(.*?)\]/)
    expect(match).toBeDefined()
    const localesStr = match![1]!
    const enCount = (localesStr.match(/"en"/g) || []).length
    expect(enCount).toBe(1)
  })

  it('skips gitignore append when entry already exists', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('package.json')) return true
      if (String(path).endsWith('fluenti.config.ts')) return false
      if (String(path).endsWith('.gitignore')) return true
      return false
    })
    vi.mocked(readFileSync).mockImplementation(((path: string) => {
      if (String(path).endsWith('package.json')) return '{"dependencies":{}}'
      if (String(path).endsWith('.gitignore')) return 'node_modules/\nsrc/locales/compiled/\n'
      return ''
    }) as typeof readFileSync)
    vi.mocked(writeFileSync).mockImplementation(() => {})

    vi.mocked(consola.prompt)
      .mockResolvedValueOnce('en' as never)
      .mockResolvedValueOnce('ja' as never)
      .mockResolvedValueOnce('po' as never)

    await runInit({ cwd: '/test' })

    // appendFileSync should NOT be called since the entry already exists
    expect(appendFileSync).not.toHaveBeenCalled()
  })

  it('does not add scripts when they already exist', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('package.json')) return true
      if (String(path).endsWith('fluenti.config.ts')) return false
      if (String(path).endsWith('.gitignore')) return false
      return false
    })
    vi.mocked(readFileSync).mockImplementation(((path: string) => {
      if (String(path).endsWith('package.json')) {
        return JSON.stringify({
          dependencies: {},
          scripts: { 'i18n:extract': 'fluenti extract', 'i18n:compile': 'fluenti compile' },
        })
      }
      return ''
    }) as typeof readFileSync)
    vi.mocked(writeFileSync).mockImplementation(() => {})

    vi.mocked(consola.prompt)
      .mockResolvedValueOnce('en' as never)
      .mockResolvedValueOnce('ja' as never)
      .mockResolvedValueOnce('po' as never)

    await runInit({ cwd: '/test' })

    // package.json should not be rewritten since scripts already exist
    const pkgCalls = vi.mocked(writeFileSync).mock.calls.filter(
      (c) => String(c[0]).endsWith('package.json'),
    )
    expect(pkgCalls).toHaveLength(0)
  })

  it('detects Next.js framework and recommends withFluenti', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('package.json')) return true
      if (String(path).endsWith('fluenti.config.ts')) return false
      if (String(path).endsWith('.gitignore')) return false
      return false
    })
    vi.mocked(readFileSync).mockImplementation(((path: string) => {
      if (String(path).endsWith('package.json')) {
        return JSON.stringify({ dependencies: { next: '^15', react: '^19' } })
      }
      return ''
    }) as typeof readFileSync)
    vi.mocked(writeFileSync).mockImplementation(() => {})

    vi.mocked(consola.prompt)
      .mockResolvedValueOnce('en' as never)
      .mockResolvedValueOnce('ja' as never)
      .mockResolvedValueOnce('po' as never)

    await runInit({ cwd: '/test' })

    expect(consola.info).toHaveBeenCalledWith(expect.stringContaining('@fluenti/next'))
    expect(consola.box).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('withFluenti'),
      }),
    )
  })

  it('shows generic Vite plugin hint for unknown framework', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('package.json')) return true
      if (String(path).endsWith('fluenti.config.ts')) return false
      if (String(path).endsWith('.gitignore')) return false
      return false
    })
    vi.mocked(readFileSync).mockImplementation(((path: string) => {
      if (String(path).endsWith('package.json')) {
        return JSON.stringify({ dependencies: { express: '^4' } })
      }
      return ''
    }) as typeof readFileSync)
    vi.mocked(writeFileSync).mockImplementation(() => {})

    vi.mocked(consola.prompt)
      .mockResolvedValueOnce('en' as never)
      .mockResolvedValueOnce('ja' as never)
      .mockResolvedValueOnce('po' as never)

    await runInit({ cwd: '/test' })

    expect(consola.box).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Configure your build tool'),
      }),
    )
  })
})
