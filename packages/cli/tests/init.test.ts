import { describe, it, expect } from 'vitest'
import { detectFramework, generateFluentiConfig, validateLocale } from '../src/init'

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
      pluginPackage: '@fluenti/vite-plugin',
    })
  })

  it('detects SolidJS', () => {
    expect(detectFramework({ 'solid-js': '^1' })).toEqual({
      name: 'solid',
      pluginPackage: '@fluenti/vite-plugin',
    })
  })

  it('detects SolidStart', () => {
    expect(detectFramework({ '@solidjs/start': '^1' })).toEqual({
      name: 'solidstart',
      pluginPackage: '@fluenti/vite-plugin',
    })
  })

  it('detects React', () => {
    expect(detectFramework({ react: '^19' })).toEqual({
      name: 'react',
      pluginPackage: '@fluenti/vite-plugin',
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
