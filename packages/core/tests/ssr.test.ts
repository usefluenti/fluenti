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

  it('rejects XSS locale with < character', () => {
    expect(() => getSSRLocaleScript('en<script>')).toThrow('locale must be a valid BCP 47 tag')
  })

  it('rejects locale with > character', () => {
    expect(() => getSSRLocaleScript('en>')).toThrow('locale must be a valid BCP 47 tag')
  })

  it('rejects locale with & character', () => {
    expect(() => getSSRLocaleScript('en&amp')).toThrow('locale must be a valid BCP 47 tag')
  })

  it('rejects locale with double quotes', () => {
    expect(() => getSSRLocaleScript('en"test')).toThrow('locale must be a valid BCP 47 tag')
  })

  it('rejects locale with single quotes', () => {
    expect(() => getSSRLocaleScript("en'test")).toThrow('locale must be a valid BCP 47 tag')
  })

  it('rejects script tag breakout via locale value', () => {
    expect(() => getSSRLocaleScript('</script><script>alert(1)</script>')).toThrow('locale must be a valid BCP 47 tag')
  })

  it('rejects JS string breakout via backslash + quote', () => {
    expect(() => getSSRLocaleScript('en\\";alert(1)//')).toThrow('locale must be a valid BCP 47 tag')
  })

  it('rejects unicode escape sequence injection', () => {
    expect(() => getSSRLocaleScript('en\u003cimg onerror=alert(1)\u003e')).toThrow('locale must be a valid BCP 47 tag')
  })

  it('throws on locale exceeding 255 characters', () => {
    const longLocale = 'a'.repeat(256)
    expect(() => getSSRLocaleScript(longLocale)).toThrow('Locale exceeds maximum length of 255')
  })

  it('throws on invalid locale format', () => {
    expect(() => getSSRLocaleScript('en<script>')).toThrow('locale must be a valid BCP 47 tag')
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

// ─── Accept-Language edge cases ─────────────────────────────────────────

describe('Accept-Language edge cases', () => {
  const available = ['en', 'fr', 'zh-CN', 'ja', 'de']

  it('malformed q-value (non-numeric) treated as 0', () => {
    const result = detectLocale({
      headers: { 'accept-language': 'en;q=abc, ja;q=0.5' },
      available,
      fallback: 'de',
    })
    // parseFloat('abc') => NaN => filtered to 0, ja has q=0.5 so ja wins
    expect(result).toBe('ja')
  })

  it('q-value > 1.0 is still parsed', () => {
    const result = detectLocale({
      headers: { 'accept-language': 'en;q=1.5' },
      available,
      fallback: 'fr',
    })
    // parseFloat('1.5') => 1.5, en is matched
    expect(result).toBe('en')
  })

  it('very long Accept-Language header (1000+ locales)', () => {
    const parts = Array.from({ length: 1200 }, (_, i) => `lang${i};q=0.${String(i % 10)}`)
    const header = parts.join(',')
    expect(() => detectLocale({
      headers: { 'accept-language': header },
      available,
      fallback: 'en',
    })).not.toThrow()
    // None of the fake locales match, should fall back
    const result = detectLocale({
      headers: { 'accept-language': header },
      available,
      fallback: 'en',
    })
    expect(result).toBe('en')
  })

  it('duplicate locales with different q values — highest q wins position', () => {
    const result = detectLocale({
      headers: { 'accept-language': 'en;q=0.5, en;q=0.9, ja;q=0.8' },
      available,
      fallback: 'fr',
    })
    // After sort: en(0.9), ja(0.8), en(0.5). First match is en.
    expect(result).toBe('en')
  })

  it('empty Accept-Language header', () => {
    const result = detectLocale({
      headers: { 'accept-language': '' },
      available,
      fallback: 'en',
    })
    expect(result).toBe('en')
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

  it('getSSRLocaleScript rejects empty string locale', () => {
    expect(() => getSSRLocaleScript('')).toThrow('locale must be a non-empty string')
  })

  it('getSSRLocaleScript rejects very long locale (100 non-BCP47 chars)', () => {
    const longLocale = 'a'.repeat(100)
    expect(() => getSSRLocaleScript(longLocale)).toThrow('locale must be a valid BCP 47 tag')
  })

  it('getSSRLocaleScript rejects null byte in locale', () => {
    expect(() => getSSRLocaleScript('en\0test')).toThrow('locale must be a valid BCP 47 tag')
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

// ─── Edge cases — SSR error recovery and boundaries ──────────────────────

describe('edge cases — SSR error recovery and boundaries', () => {
  const available = ['en', 'fr', 'zh-CN', 'ja', 'de']

  it('mixed-case "En-Us" matches "en"', () => {
    const result = detectLocale({
      cookie: 'En-Us',
      available,
      fallback: 'ja',
    })
    // 'En-Us' should case-insensitively match 'en'
    expect(result).toBe('en')
  })

  it('Headers.get() returning null falls back to fallback', () => {
    // Create a Headers-like object where get() returns null
    const headers = {
      get: () => null,
    } as unknown as Headers
    const result = detectLocale({
      headers,
      available,
      fallback: 'en',
    })
    expect(result).toBe('en')
  })

  it('empty quality q= results in NaN filtered to 0', () => {
    // q= with nothing after it → parseFloat('') → NaN → filtered to 0
    const result = detectLocale({
      headers: { 'accept-language': 'fr;q=,en;q=0.8' },
      available,
      fallback: 'ja',
    })
    // fr has q=0 (NaN filtered), en has q=0.8 → en wins
    expect(result).toBe('en')
  })

  it('empty locale string in Accept-Language is filtered', () => {
    // A leading comma creates an empty locale entry which should be filtered
    const result = detectLocale({
      headers: { 'accept-language': ',,,en;q=0.5' },
      available,
      fallback: 'ja',
    })
    expect(result).toBe('en')
  })

  it('control characters in SSR locale key are rejected', () => {
    // Control characters should fail BCP 47 validation
    expect(() => getSSRLocaleScript('en\x00')).toThrow('locale must be a valid BCP 47 tag')
    expect(() => getSSRLocaleScript('en\x1F')).toThrow('locale must be a valid BCP 47 tag')
    expect(() => getSSRLocaleScript('\ten')).toThrow('locale must be a valid BCP 47 tag')
  })

  it('XSS escaping all special chars combined', () => {
    // All these should be rejected by validateLocale before reaching the escape logic
    const xssPayloads = [
      '<script>alert(1)</script>',
      '"><img onerror=alert(1)>',
      "';alert(1)//",
      '&amp;<test>',
      'en<>"\'/&',
    ]
    for (const payload of xssPayloads) {
      expect(() => getSSRLocaleScript(payload)).toThrow()
    }
  })
})
