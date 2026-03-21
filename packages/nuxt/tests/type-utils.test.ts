import { describe, it, expect } from 'vitest'
import { resolveLocaleCodes } from '@fluenti/core'
import { resolveLocaleProperties, resolveDomainConfigs } from '../src/types'
import type { LocaleDefinition } from '@fluenti/core'

describe('resolveLocaleCodes', () => {
  it('extracts codes from plain strings', () => {
    const codes = resolveLocaleCodes(['en', 'ja', 'zh-CN'])
    expect(codes).toEqual(['en', 'ja', 'zh-CN'])
  })

  it('extracts codes from locale objects', () => {
    const codes = resolveLocaleCodes([
      { code: 'en', name: 'English' },
      { code: 'ja', name: '日本語' },
    ])
    expect(codes).toEqual(['en', 'ja'])
  })

  it('handles mixed string and object definitions', () => {
    const locales: LocaleDefinition[] = [
      'en',
      { code: 'ja', name: '日本語', iso: 'ja-JP' },
      'zh-CN',
    ]
    expect(resolveLocaleCodes(locales)).toEqual(['en', 'ja', 'zh-CN'])
  })

  it('returns empty array for empty input', () => {
    expect(resolveLocaleCodes([])).toEqual([])
  })
})

describe('resolveLocaleProperties', () => {
  it('creates minimal objects for plain strings', () => {
    const props = resolveLocaleProperties(['en', 'ja'])
    expect(props).toEqual({
      en: { code: 'en' },
      ja: { code: 'ja' },
    })
  })

  it('preserves all metadata from locale objects', () => {
    const props = resolveLocaleProperties([
      { code: 'en', name: 'English', iso: 'en-US', dir: 'ltr' },
      { code: 'ar', name: 'العربية', iso: 'ar-SA', dir: 'rtl' },
    ])
    expect(props['en']).toEqual({ code: 'en', name: 'English', iso: 'en-US', dir: 'ltr' })
    expect(props['ar']!.dir).toBe('rtl')
  })

  it('handles mixed definitions', () => {
    const props = resolveLocaleProperties([
      'en',
      { code: 'ja', name: '日本語' },
    ])
    expect(props['en']).toEqual({ code: 'en' })
    expect(props['ja']).toEqual({ code: 'ja', name: '日本語' })
  })
})

describe('resolveDomainConfigs', () => {
  it('returns explicit domains when provided', () => {
    const explicit = [
      { domain: 'example.com', locale: 'en' },
      { domain: 'example.jp', locale: 'ja' },
    ]
    const result = resolveDomainConfigs(['en', 'ja'], explicit)
    expect(result).toBe(explicit) // exact same reference
  })

  it('extracts domains from locale objects', () => {
    const locales: LocaleDefinition[] = [
      { code: 'en', domain: 'example.com' },
      { code: 'ja', domain: 'example.jp' },
      'zh-CN', // no domain
    ]
    const result = resolveDomainConfigs(locales)
    expect(result).toEqual([
      { domain: 'example.com', locale: 'en' },
      { domain: 'example.jp', locale: 'ja' },
    ])
  })

  it('returns empty array when no domains configured', () => {
    const result = resolveDomainConfigs(['en', 'ja'])
    expect(result).toEqual([])
  })

  it('prefers explicit over inline when explicit is non-empty', () => {
    const locales: LocaleDefinition[] = [
      { code: 'en', domain: 'en.example.com' },
    ]
    const explicit = [{ domain: 'www.example.com', locale: 'en' }]
    const result = resolveDomainConfigs(locales, explicit)
    expect(result[0]!.domain).toBe('www.example.com')
  })
})
