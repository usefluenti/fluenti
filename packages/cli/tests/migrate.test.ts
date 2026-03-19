import { describe, it, expect } from 'vitest'
import { resolveLibrary, buildMigratePrompt, parseResponse } from '../src/migrate'
import type { DetectedFiles } from '../src/migrate'

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
    expect(result).toContain('MIGRATION_STEPS')
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
})
