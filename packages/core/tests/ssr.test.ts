import { describe, it, expect, vi, afterEach } from 'vitest'
import { detectLocale, getSSRLocaleScript, getHydratedLocale } from '../src/ssr'

describe('detectLocale', () => {
  const available = ['en', 'fr', 'zh-CN']

  it('prioritizes cookie', () => {
    expect(detectLocale({
      cookie: 'fr',
      query: 'en',
      available,
      fallback: 'en',
    })).toBe('fr')
  })

  it('falls back to query when no cookie', () => {
    expect(detectLocale({
      query: 'zh-CN',
      available,
      fallback: 'en',
    })).toBe('zh-CN')
  })

  it('falls back to path when no query', () => {
    expect(detectLocale({
      path: 'fr',
      available,
      fallback: 'en',
    })).toBe('fr')
  })

  it('falls back to Accept-Language header', () => {
    expect(detectLocale({
      headers: { 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' },
      available,
      fallback: 'en',
    })).toBe('zh-CN')
  })

  it('falls back to fallback locale', () => {
    expect(detectLocale({
      available,
      fallback: 'en',
    })).toBe('en')
  })

  it('parses Accept-Language with quality values', () => {
    expect(detectLocale({
      headers: { 'accept-language': 'en;q=0.5,fr;q=0.9' },
      available,
      fallback: 'en',
    })).toBe('fr')
  })

  it('handles Headers object', () => {
    const headers = new Headers()
    headers.set('accept-language', 'fr')
    expect(detectLocale({
      headers,
      available,
      fallback: 'en',
    })).toBe('fr')
  })

  it('ignores cookie not in available list', () => {
    expect(detectLocale({
      cookie: 'ja',
      query: 'fr',
      available,
      fallback: 'en',
    })).toBe('fr')
  })
})

describe('getSSRLocaleScript', () => {
  it('generates script tag', () => {
    expect(getSSRLocaleScript('zh-CN')).toBe(
      '<script>window.__FLUENTI_LOCALE__="zh-CN"</script>'
    )
  })

  it('escapes < to prevent XSS', () => {
    const result = getSSRLocaleScript('en<script>')
    // The locale value inside the string should have < escaped
    expect(result).toContain('\\u003c')
    expect(result).toContain('\\u003e')
    // Should not contain a raw <script> from the locale value
    expect(result).toBe('<script>window.__FLUENTI_LOCALE__="en\\u003cscript\\u003e"</script>')
  })

  it('escapes > to prevent XSS', () => {
    const result = getSSRLocaleScript('en>')
    expect(result).toContain('\\u003e')
  })

  it('escapes & to prevent XSS', () => {
    const result = getSSRLocaleScript('en&amp')
    expect(result).toContain('\\u0026')
  })

  it('escapes double quotes', () => {
    const result = getSSRLocaleScript('en"test')
    expect(result).toContain('\\"')
  })

  it('escapes single quotes', () => {
    const result = getSSRLocaleScript("en'test")
    expect(result).toContain('\\u0027')
  })

  it('prevents script tag breakout via locale value', () => {
    const result = getSSRLocaleScript('</script><script>alert(1)</script>')
    expect(result).not.toMatch(/<\/script><script>/)
    expect(result).toContain('\\u003c/script\\u003e')
  })

  it('prevents JS string breakout via backslash + quote', () => {
    const result = getSSRLocaleScript('en\\";alert(1)//')
    // Backslash must be escaped first, then the quote
    expect(result).toContain('\\\\')
    expect(result).toContain('\\"')
    // The escaped quote should not close the string — the output must be a valid JS string
    // en\" becomes en\\\\" in the output (escaped backslash + escaped quote)
    expect(result).toMatch(/^<script>window\.__FLUENTI_LOCALE__=".*"<\/script>$/)
  })

  it('prevents unicode escape sequence injection', () => {
    const result = getSSRLocaleScript('en\u003cimg onerror=alert(1)\u003e')
    expect(result).not.toContain('<img')
    expect(result).toContain('\\u003c')
  })
})

describe('getHydratedLocale', () => {
  afterEach(() => {
    // Clean up
    if (typeof globalThis.window !== 'undefined') {
      delete (globalThis.window as any).__FLUENTI_LOCALE__
    }
  })

  it('returns window.__FLUENTI_LOCALE__ if set', () => {
    (globalThis as any).window = { __FLUENTI_LOCALE__: 'fr' }
    expect(getHydratedLocale('en')).toBe('fr')
    delete (globalThis as any).window
  })

  it('returns fallback when window variable not set', () => {
    (globalThis as any).window = {}
    expect(getHydratedLocale('en')).toBe('en')
    delete (globalThis as any).window
  })

  it('returns "en" when no fallback and no window', () => {
    // In Node, window is undefined
    const origWindow = (globalThis as any).window
    delete (globalThis as any).window
    expect(getHydratedLocale()).toBe('en')
    if (origWindow !== undefined) {
      (globalThis as any).window = origWindow
    }
  })

  it('returns fallback when no window exists', () => {
    const origWindow = (globalThis as any).window
    delete (globalThis as any).window
    expect(getHydratedLocale('de')).toBe('de')
    if (origWindow !== undefined) {
      (globalThis as any).window = origWindow
    }
  })
})
