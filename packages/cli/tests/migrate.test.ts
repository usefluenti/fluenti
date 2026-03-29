import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveLibrary, buildMigratePrompt, parseResponse, runMigrate } from '../src/migrate'
import type { DetectedFiles, MigrateOptions } from '../src/migrate'

describe('resolveLibrary', () => {
  it('resolves exact library names', () => {
    expect(resolveLibrary('vue-i18n')).toBe('vue-i18n')
    expect(resolveLibrary('react-i18next')).toBe('react-i18next')
    expect(resolveLibrary('next-intl')).toBe('next-intl')
    expect(resolveLibrary('next-i18next')).toBe('next-i18next')
    expect(resolveLibrary('lingui')).toBe('lingui')
    expect(resolveLibrary('nuxt-i18n')).toBe('nuxt-i18n')
  })

  it('normalizes @nuxtjs/ prefix to nuxt-', () => {
    expect(resolveLibrary('@nuxtjs/i18n')).toBe('nuxt-i18n')
  })

  it('is case insensitive', () => {
    expect(resolveLibrary('Vue-I18n')).toBe('vue-i18n')
    expect(resolveLibrary('REACT-I18NEXT')).toBe('react-i18next')
  })

  it('returns undefined for unsupported libraries', () => {
    expect(resolveLibrary('unknown-lib')).toBeUndefined()
    expect(resolveLibrary('')).toBeUndefined()
    expect(resolveLibrary('i18next')).toBeUndefined()
  })
})

describe('buildMigratePrompt', () => {
  const emptyDetected: DetectedFiles = {
    configFiles: [],
    localeFiles: [],
    sampleSources: [],
    packageJson: undefined,
  }

  it('includes the library name and framework', () => {
    const libraryInfo = {
      name: 'vue-i18n' as const,
      framework: 'Vue',
      configPatterns: [],
      localePatterns: [],
      sourcePatterns: [],
      migrationGuide: '',
    }

    const result = buildMigratePrompt(libraryInfo, emptyDetected, '')

    expect(result).toContain('Vue')
    expect(result).toContain('vue-i18n')
    expect(result).toContain('Fluenti')
  })

  it('includes migration guide when provided', () => {
    const libraryInfo = {
      name: 'react-i18next' as const,
      framework: 'React',
      configPatterns: [],
      localePatterns: [],
      sourcePatterns: [],
      migrationGuide: '',
    }

    const guide = 'Step 1: Replace useTranslation with useI18n'
    const result = buildMigratePrompt(libraryInfo, emptyDetected, guide)

    expect(result).toContain('MIGRATION GUIDE')
    expect(result).toContain(guide)
  })

  it('omits migration guide section when empty', () => {
    const libraryInfo = {
      name: 'lingui' as const,
      framework: 'React',
      configPatterns: [],
      localePatterns: [],
      sourcePatterns: [],
      migrationGuide: '',
    }

    const result = buildMigratePrompt(libraryInfo, emptyDetected, '')

    expect(result).not.toContain('MIGRATION GUIDE')
  })

  it('includes package.json when detected', () => {
    const libraryInfo = {
      name: 'vue-i18n' as const,
      framework: 'Vue',
      configPatterns: [],
      localePatterns: [],
      sourcePatterns: [],
      migrationGuide: '',
    }

    const detected: DetectedFiles = {
      ...emptyDetected,
      packageJson: '{"name": "my-app", "dependencies": {"vue-i18n": "^9.0.0"}}',
    }

    const result = buildMigratePrompt(libraryInfo, detected, '')

    expect(result).toContain('package.json')
    expect(result).toContain('vue-i18n')
  })

  it('includes config files when detected', () => {
    const libraryInfo = {
      name: 'vue-i18n' as const,
      framework: 'Vue',
      configPatterns: [],
      localePatterns: [],
      sourcePatterns: [],
      migrationGuide: '',
    }

    const detected: DetectedFiles = {
      ...emptyDetected,
      configFiles: [{ path: 'i18n.ts', content: 'export default { locale: "en" }' }],
    }

    const result = buildMigratePrompt(libraryInfo, detected, '')

    expect(result).toContain('EXISTING CONFIG FILES')
    expect(result).toContain('i18n.ts')
  })

  it('includes output format instructions', () => {
    const libraryInfo = {
      name: 'vue-i18n' as const,
      framework: 'Vue',
      configPatterns: [],
      localePatterns: [],
      sourcePatterns: [],
      migrationGuide: '',
    }

    const result = buildMigratePrompt(libraryInfo, emptyDetected, '')

    expect(result).toContain('FLUENTI_CONFIG')
    expect(result).toContain('LOCALE_FILES')
    expect(result).toContain('SOURCE_PATCHES')
    expect(result).toContain('INSTALL_COMMANDS')
  })
})

describe('parseResponse', () => {
  it('extracts config from response', () => {
    const response = [
      '### FLUENTI_CONFIG',
      '```ts',
      'export default { sourceLocale: "en" }',
      '```',
    ].join('\n')

    const result = parseResponse(response)

    expect(result.config).toBe('export default { sourceLocale: "en" }')
  })

  it('extracts locale files from response', () => {
    const response = [
      '### LOCALE_FILES',
      '#### LOCALE: fr',
      '```po',
      'msgid "Hello"',
      'msgstr "Bonjour"',
      '```',
      '#### LOCALE: de',
      '```po',
      'msgid "Hello"',
      'msgstr "Hallo"',
      '```',
      '### MIGRATION_STEPS',
      'No steps.',
    ].join('\n')

    const result = parseResponse(response)

    expect(result.localeFiles).toHaveLength(2)
    expect(result.localeFiles[0]!.locale).toBe('fr')
    expect(result.localeFiles[0]!.content).toContain('Bonjour')
    expect(result.localeFiles[1]!.locale).toBe('de')
    expect(result.localeFiles[1]!.content).toContain('Hallo')
  })

  it('extracts migration steps', () => {
    const response = [
      '### MIGRATION_STEPS',
      '1. Replace `useI18n` import',
      '2. Update template syntax',
      '### INSTALL_COMMANDS',
      '```bash',
      'npm install @fluenti/vue',
      '```',
    ].join('\n')

    const result = parseResponse(response)

    expect(result.steps).toContain('Replace `useI18n` import')
    expect(result.steps).toContain('Update template syntax')
  })

  it('extracts install commands', () => {
    const response = [
      '### INSTALL_COMMANDS',
      '```bash',
      'npm install @fluenti/vue',
      'npm uninstall vue-i18n',
      '```',
    ].join('\n')

    const result = parseResponse(response)

    expect(result.installCommands).toContain('npm install @fluenti/vue')
    expect(result.installCommands).toContain('npm uninstall vue-i18n')
  })

  it('handles response with no matching sections', () => {
    const result = parseResponse('Some random text without sections')

    expect(result.config).toBeUndefined()
    expect(result.localeFiles).toEqual([])
    expect(result.steps).toBeUndefined()
    expect(result.installCommands).toBeUndefined()
  })

  it('handles complete response with all sections', () => {
    const response = [
      '### FLUENTI_CONFIG',
      '```ts',
      'export default { sourceLocale: "en", targetLocales: ["fr"] }',
      '```',
      '',
      '### LOCALE_FILES',
      '#### LOCALE: fr',
      '```po',
      'msgid "Hello"',
      'msgstr "Bonjour"',
      '```',
      '',
      '### MIGRATION_STEPS',
      '1. Install fluenti',
      '',
      '### INSTALL_COMMANDS',
      '```bash',
      'pnpm add @fluenti/vue',
      '```',
    ].join('\n')

    const result = parseResponse(response)

    expect(result.config).toBeDefined()
    expect(result.localeFiles).toHaveLength(1)
    expect(result.steps).toBeDefined()
    expect(result.installCommands).toBeDefined()
  })

  it('parseResponse returns empty locale files for empty AI output', () => {
    const result = parseResponse('')

    expect(result.config).toBeUndefined()
    expect(result.localeFiles).toEqual([])
    expect(result.steps).toBeUndefined()
    expect(result.installCommands).toBeUndefined()
  })

  it('parseResponse handles response with LOCALE_FILES section but no locale entries', () => {
    const response = [
      '### LOCALE_FILES',
      'No locale files generated.',
      '### MIGRATION_STEPS',
      'Nothing to migrate.',
    ].join('\n')

    const result = parseResponse(response)

    expect(result.localeFiles).toEqual([])
    expect(result.steps).toBe('Nothing to migrate.')
  })
})

describe('migrate — edge cases', () => {
  it('resolveLibrary returns undefined for empty string', () => {
    expect(resolveLibrary('')).toBeUndefined()
  })

  it('resolveLibrary returns undefined for unknown library', () => {
    expect(resolveLibrary('some-unknown-lib')).toBeUndefined()
  })

  it('buildMigratePrompt includes all detected file sections', () => {
    const libraryInfo = {
      name: 'vue-i18n' as const,
      framework: 'Vue',
      configPatterns: [],
      localePatterns: [],
      sourcePatterns: [],
      migrationGuide: '',
    }

    const detected: DetectedFiles = {
      configFiles: [{ path: 'i18n.ts', content: 'config content' }],
      localeFiles: [{ path: 'locales/en.json', content: '{"hello":"Hello"}' }],
      sampleSources: [{ path: 'src/App.vue', content: '<template>Hello</template>' }],
      packageJson: '{"name":"test"}',
    }

    const result = buildMigratePrompt(libraryInfo, detected, 'migration guide text')

    expect(result).toContain('EXISTING CONFIG FILES')
    expect(result).toContain('i18n.ts')
    expect(result).toContain('EXISTING LOCALE FILES')
    expect(result).toContain('locales/en.json')
    expect(result).toContain('SAMPLE SOURCE FILES')
    expect(result).toContain('src/App.vue')
    expect(result).toContain('MIGRATION GUIDE')
    expect(result).toContain('migration guide text')
    expect(result).toContain('package.json')
  })
})

describe('parseResponse — additional edge cases', () => {
  it('truncates oversized responses (>500KB)', () => {
    // Build a response that exceeds 500KB by padding with filler text,
    // but put valid sections at the BEGINNING so they are still parseable.
    const validPart = [
      '### FLUENTI_CONFIG',
      '```ts',
      'export default { sourceLocale: "en" }',
      '```',
    ].join('\n')
    const padding = 'x'.repeat(600_000)
    const response = validPart + '\n' + padding

    const result = parseResponse(response)

    // The config at the beginning should still be parsed successfully
    expect(result.config).toBe('export default { sourceLocale: "en" }')
  })

  it('handles typescript code fence language specifier', () => {
    const response = [
      '### FLUENTI_CONFIG',
      '```typescript',
      'export default defineConfig({ sourceLocale: "en" })',
      '```',
    ].join('\n')

    const result = parseResponse(response)

    expect(result.config).toBe('export default defineConfig({ sourceLocale: "en" })')
  })

  it('handles sh code fence for install commands', () => {
    const response = [
      '### INSTALL_COMMANDS',
      '```sh',
      'pnpm add -D @fluenti/vue',
      '```',
    ].join('\n')

    const result = parseResponse(response)

    expect(result.installCommands).toBe('pnpm add -D @fluenti/vue')
  })

  it('extracts locale files at end of response (no subsequent section)', () => {
    const response = [
      '### LOCALE_FILES',
      '#### LOCALE: ja',
      '```po',
      'msgid "Hello"',
      'msgstr "こんにちは"',
      '```',
    ].join('\n')

    const result = parseResponse(response)

    expect(result.localeFiles).toHaveLength(1)
    expect(result.localeFiles[0]!.locale).toBe('ja')
    expect(result.localeFiles[0]!.content).toContain('こんにちは')
  })
})

// ─── runMigrate integration tests (with mocked fs/consola/child_process) ─────

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}))

vi.mock('node:util', async () => {
  const actual = await vi.importActual<typeof import('node:util')>('node:util')
  return {
    ...actual,
    promisify: vi.fn((fn: unknown) => fn),
  }
})

vi.mock('fast-glob', () => ({
  default: vi.fn().mockResolvedValue([]),
}))

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => ''),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
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
    },
  }
})

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFile } from 'node:child_process'
import consola from 'consola'

describe('runMigrate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs error for unsupported library and returns', async () => {
    await runMigrate({ from: 'unknown-lib', provider: 'claude', write: false })

    expect(consola.error).toHaveBeenCalledWith(expect.stringContaining('Unsupported library'))
  })

  it('warns when no config or locale files found', async () => {
    // existsSync returns false for all (no config files found)
    vi.mocked(existsSync).mockReturnValue(false)

    await runMigrate({ from: 'vue-i18n', provider: 'claude', write: false })

    expect(consola.warn).toHaveBeenCalledWith(expect.stringContaining('No vue-i18n configuration'))
  })

  it('runs full migrate flow in dry-run mode (write=false)', async () => {
    // Simulate finding a config file
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('i18n.ts')) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('export default { locale: "en" }')

    // Mock the AI invocation (execFile is already promisified by our mock)
    const aiResponse = [
      '### FLUENTI_CONFIG',
      '```ts',
      'export default defineConfig({ sourceLocale: "en" })',
      '```',
      '### LOCALE_FILES',
      '#### LOCALE: fr',
      '```po',
      'msgid "Hello"',
      'msgstr "Bonjour"',
      '```',
      '### MIGRATION_STEPS',
      '1. Replace imports',
      '### INSTALL_COMMANDS',
      '```bash',
      'pnpm add @fluenti/vue',
      '```',
    ].join('\n')

    vi.mocked(execFile as unknown as (...args: unknown[]) => Promise<{ stdout: string }>)
      .mockResolvedValueOnce({ stdout: aiResponse })

    await runMigrate({ from: 'vue-i18n', provider: 'claude', write: false })

    // Should NOT write files in dry-run
    expect(writeFileSync).not.toHaveBeenCalled()
    // Should display boxes
    expect(consola.box).toHaveBeenCalled()
    // Should suggest --write
    expect(consola.info).toHaveBeenCalledWith(expect.stringContaining('--write'))
  })

  it('writes config and locale files when write=true', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('i18n.ts')) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('export default {}')

    const aiResponse = [
      '### FLUENTI_CONFIG',
      '```ts',
      'export default defineConfig({})',
      '```',
      '### LOCALE_FILES',
      '#### LOCALE: ja',
      '```po',
      'msgid "Hi"',
      'msgstr "やあ"',
      '```',
    ].join('\n')

    vi.mocked(execFile as unknown as (...args: unknown[]) => Promise<{ stdout: string }>)
      .mockResolvedValueOnce({ stdout: aiResponse })

    await runMigrate({ from: 'vue-i18n', provider: 'claude', write: true })

    // Should write config and locale files
    expect(writeFileSync).toHaveBeenCalled()
    expect(mkdirSync).toHaveBeenCalled()
    expect(consola.success).toHaveBeenCalled()
  })

  it('handles codex provider', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('i18n.ts')) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('{}')

    vi.mocked(execFile as unknown as (...args: unknown[]) => Promise<{ stdout: string }>)
      .mockResolvedValueOnce({ stdout: '### MIGRATION_STEPS\nDone.' })

    await runMigrate({ from: 'vue-i18n', provider: 'codex', write: false })

    // The codex provider should have been invoked (no error)
    expect(consola.info).toHaveBeenCalledWith(expect.stringContaining('codex'))
  })

  it('displays locale file content truncated to 500 chars in dry-run', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('i18n.ts')) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('{}')

    const longContent = 'x'.repeat(600)
    const aiResponse = [
      '### LOCALE_FILES',
      '#### LOCALE: fr',
      '```po',
      longContent,
      '```',
    ].join('\n')

    vi.mocked(execFile as unknown as (...args: unknown[]) => Promise<{ stdout: string }>)
      .mockResolvedValueOnce({ stdout: aiResponse })

    await runMigrate({ from: 'vue-i18n', provider: 'claude', write: false })

    // consola.box should be called with truncated content
    expect(consola.box).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('use --write to save full file'),
      }),
    )
  })

  it('displays install commands when present', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('i18n.ts')) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('{}')

    const aiResponse = [
      '### INSTALL_COMMANDS',
      '```bash',
      'npm install @fluenti/vue',
      '```',
    ].join('\n')

    vi.mocked(execFile as unknown as (...args: unknown[]) => Promise<{ stdout: string }>)
      .mockResolvedValueOnce({ stdout: aiResponse })

    await runMigrate({ from: 'vue-i18n', provider: 'claude', write: false })

    expect(consola.box).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Install Commands' }),
    )
  })

  it('displays migration steps when present', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('i18n.ts')) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('{}')

    const aiResponse = [
      '### MIGRATION_STEPS',
      '1. Do something',
      '2. Do another thing',
    ].join('\n')

    vi.mocked(execFile as unknown as (...args: unknown[]) => Promise<{ stdout: string }>)
      .mockResolvedValueOnce({ stdout: aiResponse })

    await runMigrate({ from: 'vue-i18n', provider: 'claude', write: false })

    expect(consola.box).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Migration Steps' }),
    )
  })

  it('handles AI provider ENOENT error (CLI not installed)', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('i18n.ts')) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('{}')

    const enoentError = new Error('spawn claude ENOENT') as Error & { code: string }
    enoentError.code = 'ENOENT'
    vi.mocked(execFile as unknown as (...args: unknown[]) => Promise<{ stdout: string }>)
      .mockRejectedValueOnce(enoentError)

    await expect(
      runMigrate({ from: 'vue-i18n', provider: 'claude', write: false }),
    ).rejects.toThrow('CLI not found')
  })

  it('handles AI provider EACCES error', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('i18n.ts')) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('{}')

    const eaccesError = new Error('spawn claude EACCES') as Error & { code: string }
    eaccesError.code = 'EACCES'
    vi.mocked(execFile as unknown as (...args: unknown[]) => Promise<{ stdout: string }>)
      .mockRejectedValueOnce(eaccesError)

    await expect(
      runMigrate({ from: 'vue-i18n', provider: 'claude', write: false }),
    ).rejects.toThrow('CLI not found')
  })

  it('handles response with no results (no config, no locales, no steps)', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('i18n.ts')) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('{}')

    vi.mocked(execFile as unknown as (...args: unknown[]) => Promise<{ stdout: string }>)
      .mockResolvedValueOnce({ stdout: 'Some unhelpful AI text without proper sections.' })

    await runMigrate({ from: 'vue-i18n', provider: 'claude', write: false })

    // Should not write anything and should not crash
    expect(writeFileSync).not.toHaveBeenCalled()
  })

  it('does not suggest --write when no config or locales generated', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (String(path).endsWith('i18n.ts')) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('{}')

    vi.mocked(execFile as unknown as (...args: unknown[]) => Promise<{ stdout: string }>)
      .mockResolvedValueOnce({ stdout: '### MIGRATION_STEPS\nNothing special' })

    await runMigrate({ from: 'vue-i18n', provider: 'claude', write: false })

    // Should NOT suggest --write since there's nothing to write
    const infoCalls = vi.mocked(consola.info).mock.calls.map((c) => String(c[0]))
    expect(infoCalls.some((c) => c.includes('--write'))).toBe(false)
  })
})
