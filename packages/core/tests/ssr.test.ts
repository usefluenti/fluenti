import { describe, it, expect, afterEach } from 'vitest'
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

  // ─── Malformed Accept-Language ──────────────────────────────────────────

  describe('malformed Accept-Language', () => {
    it('handles garbage string', () => {
      expect(detectLocale({
        headers: { 'accept-language': ';;;,,,;;;' },
        available,
        fallback: 'en',
      })).toBe('en')
    })

    it('handles missing quality value (parseFloat empty string)', () => {
      expect(detectLocale({
        headers: { 'accept-language': 'en;q=,fr;q=0.9' },
        available,
        fallback: 'en',
      })).toBe('fr')
    })

    it('handles empty string header', () => {
      expect(detectLocale({
        headers: { 'accept-language': '' },
        available,
        fallback: 'en',
      })).toBe('en')
    })

    it('handles wildcard *', () => {
      expect(detectLocale({
        headers: { 'accept-language': '*' },
        available,
        fallback: 'en',
      })).toBe('en')
    })

    it('handles extra-long header (1000+ chars)', () => {
      const longHeader = Array.from({ length: 200 }, (_, i) => `lang${i};q=0.${String(i).padStart(3, '0')}`).join(',')
      expect(() => detectLocale({
        headers: { 'accept-language': longHeader },
        available,
        fallback: 'en',
      })).not.toThrow()
    })

    it('handles empty cookie value', () => {
      expect(detectLocale({
        cookie: '',
        available,
        fallback: 'en',
      })).toBe('en')
    })
  })

  // ─── SSR edge cases ────────────────────────────────────────────────────

  describe('SSR edge cases', () => {
    it('handles empty path string', () => {
      expect(detectLocale({
        path: '',
        available,
        fallback: 'en',
      })).toBe('en')
    })

    it('matches Accept-Language with region subtag to base locale', () => {
      expect(detectLocale({
        headers: { 'accept-language': 'en-US' },
        available,
        fallback: 'fr',
      })).toBe('en')
    })

    it('returns fallback when all options are empty/undefined', () => {
      expect(detectLocale({
        available,
        fallback: 'en',
      })).toBe('en')
    })

    it('matches locale case-insensitively', () => {
      expect(detectLocale({
        cookie: 'FR',
        available,
        fallback: 'en',
      })).toBe('fr')
    })
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

describe('edge cases - exhaustive', () => {
  // ─── detectLocale ───────────────────────────────────────────────────

  const available = ['en', 'fr', 'zh-CN', 'ja', 'de']

  it('detectLocale multiple accept-language values with correct priority', () => {
    const result = detectLocale({
      headers: { 'accept-language': 'ja;q=0.7,de;q=0.9,fr;q=0.8' },
      available,
      fallback: 'en',
    })
    expect(result).toBe('de')
  })

  it('detectLocale path partial match "english" does not match "en"', () => {
    const result = detectLocale({
      path: 'english',
      available,
      fallback: 'en',
    })
    // "english" is not "en" and should not partially match
    expect(result).toBe('en')
  })

  it('detectLocale all sources set (cookie wins)', () => {
    const result = detectLocale({
      cookie: 'ja',
      query: 'fr',
      path: 'de',
      headers: { 'accept-language': 'zh-CN' },
      available,
      fallback: 'en',
    })
    expect(result).toBe('ja')
  })

  it('detectLocale q=0 explicit rejection', () => {
    // q=0 means the locale is explicitly rejected; parseFloat gives 0
    // The locale should still appear in the sorted list but with lowest priority
    const result = detectLocale({
      headers: { 'accept-language': 'fr;q=0,en;q=0.5' },
      available,
      fallback: 'ja',
    })
    expect(result).toBe('en')
  })

  // ─── getSSRLocaleScript ─────────────────────────────────────────────

  it('getSSRLocaleScript empty string locale', () => {
    const result = getSSRLocaleScript('')
    expect(result).toBe('<script>window.__FLUENTI_LOCALE__=""</script>')
  })

  it('getSSRLocaleScript very long locale (100 chars)', () => {
    const longLocale = 'a'.repeat(100)
    const result = getSSRLocaleScript(longLocale)
    expect(result).toContain(longLocale)
    expect(result).toMatch(/^<script>window\.__FLUENTI_LOCALE__=".*"<\/script>$/)
  })

  it('getSSRLocaleScript null byte in locale', () => {
    const result = getSSRLocaleScript('en\0test')
    expect(result).toContain('en')
    expect(typeof result).toBe('string')
  })

  // ─── getHydratedLocale ──────────────────────────────────────────────

  it('getHydratedLocale value is number (not string) returns fallback', () => {
    (globalThis as any).window = { __FLUENTI_LOCALE__: 42 }
    expect(getHydratedLocale('en')).toBe('en')
    delete (globalThis as any).window
  })

  it('getHydratedLocale value is empty string returns empty string', () => {
    (globalThis as any).window = { __FLUENTI_LOCALE__: '' }
    // Empty string is typeof 'string', so it returns ''
    expect(getHydratedLocale('en')).toBe('')
    delete (globalThis as any).window
  })

  // ─── parseAcceptLanguage (tested via detectLocale) ──────────────────

  it('parseAcceptLanguage duplicate locale keeps highest q', () => {
    // Both "en" entries appear; after sort the q=0.9 one comes first
    // but negotiateLocale sees 'en' appearing, so result should be 'en'
    const result = detectLocale({
      headers: { 'accept-language': 'en;q=0.5,en;q=0.9' },
      available,
      fallback: 'ja',
    })
    expect(result).toBe('en')
  })

  it('parseAcceptLanguage q>1 (invalid but real)', () => {
    // q=2 is technically invalid but parseFloat handles it
    const result = detectLocale({
      headers: { 'accept-language': 'fr;q=2,en;q=0.9' },
      available,
      fallback: 'ja',
    })
    // fr has higher q so it should be first
    expect(result).toBe('fr')
  })

  it('parseAcceptLanguage negative q=-1', () => {
    const result = detectLocale({
      headers: { 'accept-language': 'fr;q=-1,en;q=0.5' },
      available,
      fallback: 'ja',
    })
    // en has higher q than fr (which is -1)
    expect(result).toBe('en')
  })
})
