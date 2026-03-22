import { describe, it, expect } from 'vitest'
import { defineConfig } from '../src/config'

describe('defineConfig', () => {
  it('returns the same object passed in (identity function)', () => {
    const input = { sourceLocale: 'en' as const, locales: ['en', 'ja'] }
    const result = defineConfig(input)
    expect(result).toBe(input)
  })

  it('accepts a config with all fields', () => {
    const fullConfig = {
      sourceLocale: 'en' as const,
      locales: ['en', 'ja', 'zh-CN'],
      catalogDir: './locales',
      format: 'po' as const,
      include: ['./src/**/*.{vue,tsx,ts}'],
      exclude: ['./src/**/*.test.ts'],
      compileOutDir: './src/locales/compiled',
      devWarnings: true,
      fallbackChain: { ja: ['en'] },
      splitting: 'dynamic' as const,
      defaultBuildLocale: 'en',
    }

    const result = defineConfig(fullConfig)
    expect(result).toBe(fullConfig)
    expect(result).toEqual(fullConfig)
  })

  it('accepts an empty object', () => {
    const result = defineConfig({})
    expect(result).toEqual({})
  })
})
