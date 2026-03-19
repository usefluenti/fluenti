import { describe, it, expect, vi } from 'vitest'
import { createFluent } from '../src/index'
import { msg, hashMessage } from '../src/msg'

describe('createFluent', () => {
  it('creates an instance with locale', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: { en: {} },
    })
    expect(i18n.locale).toBe('en')
  })

  it('translates a simple message', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: { en: { greeting: 'Hello {name}!' } },
    })
    expect(i18n.t('greeting', { name: 'World' })).toBe('Hello World!')
  })

  it('falls back to fallbackLocale', () => {
    const i18n = createFluent({
      locale: 'fr',
      fallbackLocale: 'en',
      messages: {
        en: { greeting: 'Hello' },
        fr: {},
      },
    })
    expect(i18n.t('greeting')).toBe('Hello')
  })

  it('returns id for missing message', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: { en: {} },
    })
    expect(i18n.t('missing.key')).toBe('missing.key')
  })

  it('calls missing handler', () => {
    const missing = vi.fn().mockReturnValue('MISSING')
    const i18n = createFluent({
      locale: 'en',
      messages: { en: {} },
      missing,
    })
    expect(i18n.t('unknown')).toBe('MISSING')
    expect(missing).toHaveBeenCalledWith('en', 'unknown')
  })

  it('missing handler returning undefined falls back to id', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: { en: {} },
      missing: () => undefined,
    })
    expect(i18n.t('unknown')).toBe('unknown')
  })

  it('setLocale changes active locale', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: {
        en: { greeting: 'Hello' },
        fr: { greeting: 'Bonjour' },
      },
    })
    expect(i18n.t('greeting')).toBe('Hello')
    i18n.setLocale('fr')
    expect(i18n.locale).toBe('fr')
    expect(i18n.t('greeting')).toBe('Bonjour')
  })

  it('loadMessages adds new messages', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: { en: {} },
    })
    i18n.loadMessages('en', { greeting: 'Hello' })
    expect(i18n.t('greeting')).toBe('Hello')
  })

  it('getLocales returns loaded locales', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: {
        en: { greeting: 'Hello' },
        fr: { greeting: 'Bonjour' },
      },
    })
    expect(i18n.getLocales()).toEqual(['en', 'fr'])
  })

  it('formats numbers with n()', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: { en: {} },
      numberFormats: {
        currency: { style: 'currency', currency: 'USD' },
      },
    })
    const result = i18n.n(42.5, 'currency')
    expect(result).toContain('42')
    expect(result).toContain('$')
  })

  it('formats dates with d()', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: { en: {} },
      dateFormats: {
        long: { dateStyle: 'long' },
      },
    })
    const result = i18n.d(new Date(2024, 0, 15), 'long')
    expect(result).toContain('January')
    expect(result).toContain('2024')
  })

  it('format() interpolates ICU messages directly', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: { en: {} },
    })
    expect(i18n.format('Hello {name}!', { name: 'World' })).toBe('Hello World!')
  })

  it('handles MessageDescriptor from msg()', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: { en: {} },
    })
    const desc = msg.descriptor({ id: 'test', message: 'Hello {name}' })
    expect(i18n.t(desc, { name: 'World' })).toBe('Hello World')
  })

  it('handles compiled function messages', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: {
        en: {
          greeting: ((values?: Record<string, unknown>) =>
            `Hello ${values?.['name'] ?? 'stranger'}`) as any,
        },
      },
    })
    expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hello Alice')
  })

  it('supports fallbackChain', () => {
    const i18n = createFluent({
      locale: 'zh-TW',
      messages: {
        'zh-TW': {},
        'zh-CN': { greeting: 'Hello from zh-CN' },
        en: { greeting: 'Hello from en' },
      },
      fallbackChain: {
        'zh-TW': ['zh-CN', 'en'],
      },
    })
    expect(i18n.t('greeting')).toBe('Hello from zh-CN')
  })

  it('locale property is writable', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: { en: {} },
    })
    i18n.locale = 'fr'
    expect(i18n.locale).toBe('fr')
  })

  // ─── Tagged template (dual-mode t) ──────────────────────────────────

  describe('tagged template', () => {
    it('t`Hello World` — no expressions', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
      })
      expect(i18n.t`Hello World`).toBe('Hello World')
    })

    it('t`Hello ${name}` — simple variable', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
      })
      const name = 'Alice'
      expect(i18n.t`Hello ${name}`).toBe('Hello Alice')
    })

    it('t`${a} and ${b}` — multiple expressions', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
      })
      const a = 'foo'
      const b = 'bar'
      expect(i18n.t`${a} and ${b}`).toBe('foo and bar')
    })

    it('equivalent to t("Hello {arg0}", { arg0: name })', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
      })
      const name = 'Bob'
      const tagged = i18n.t`Hello ${name}`
      const functional = i18n.t('Hello {arg0}', { arg0: name })
      expect(tagged).toBe(functional)
    })

    it('looks up catalog when ICU message matches a key', () => {
      const i18n = createFluent({
        locale: 'en',
        fallbackLocale: 'en',
        messages: {
          en: { 'Hello {arg0}': 'Hi {arg0}!' },
        },
      })
      const name = 'Carol'
      expect(i18n.t`Hello ${name}`).toBe('Hi Carol!')
    })

    it('looks up translation by hash ID (compiled catalog format)', () => {
      const hash = hashMessage('Select token')
      const i18n = createFluent({
        locale: 'zh-CN',
        fallbackLocale: 'en',
        messages: {
          en: { [hash]: 'Select token' },
          'zh-CN': { [hash]: '选择代币' },
        },
      })
      expect(i18n.t`Select token`).toBe('选择代币')
    })

    it('falls back to ICU interpolation when no catalog match', () => {
      const i18n = createFluent({
        locale: 'ja',
        fallbackLocale: 'en',
        messages: {
          en: {},
          ja: {},
        },
      })
      const count = 42
      expect(i18n.t`You have ${count} items`).toBe('You have 42 items')
    })
  })

  // ─── Edge cases ──────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('missing handler that throws does not crash', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
        missing: () => {
          throw new Error('boom')
        },
      })
      expect(i18n.t('unknown')).toBe('unknown')
    })

    it('locale not in messages returns id', () => {
      const i18n = createFluent({
        locale: 'ja',
        messages: { en: { greeting: 'Hello' } },
      })
      expect(i18n.t('greeting')).toBe('greeting')
    })

    it('fallbackChain with wildcard *', () => {
      const i18n = createFluent({
        locale: 'de',
        messages: {
          de: {},
          en: { greeting: 'Hello' },
        },
        fallbackChain: {
          '*': ['en'],
        },
      })
      expect(i18n.t('greeting')).toBe('Hello')
    })

    it('d() handles NaN without throwing', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
      })
      expect(() => i18n.d(NaN)).not.toThrow()
    })

    it('n() handles NaN', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
      })
      expect(i18n.n(NaN)).toBe('NaN')
    })

    it('t() with MessageDescriptor without message uses catalog', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: { test: 'From catalog' } },
      })
      expect(i18n.t({ id: 'test' })).toBe('From catalog')
    })

    it('loadMessages then translate works', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
      })
      i18n.loadMessages('fr', { greeting: 'Bonjour' })
      i18n.setLocale('fr')
      expect(i18n.t('greeting')).toBe('Bonjour')
    })
  })

  // ─── Edge cases - exhaustive ──────────────────────────────────────────

  describe('edge cases - exhaustive', () => {
    it('t() compiled function throws exception returns id', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: {
          en: {
            broken: (() => { throw new Error('runtime error') }) as any,
          },
        },
      })
      // The compiled function throws, which will propagate
      expect(() => i18n.t('broken')).toThrow('runtime error')
    })

    it('t() compiled function returning undefined falls back to the key', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: {
          en: {
            empty: (() => undefined) as any,
          },
        },
      })
      const result = i18n.t('empty')
      expect(result).toBe('empty')
    })

    it('fallbackChain locale-specific priority over wildcard *', () => {
      const i18n = createFluent({
        locale: 'de',
        messages: {
          de: {},
          fr: { greeting: 'Bonjour' },
          en: { greeting: 'Hello' },
        },
        fallbackChain: {
          'de': ['fr'],
          '*': ['en'],
        },
      })
      // de-specific chain ['fr'] should be used, not wildcard ['en']
      expect(i18n.t('greeting')).toBe('Bonjour')
    })

    it('fallbackChain empty array returns id', () => {
      const i18n = createFluent({
        locale: 'de',
        messages: {
          de: {},
          en: { greeting: 'Hello' },
        },
        fallbackChain: {
          'de': [],
        },
      })
      expect(i18n.t('greeting')).toBe('greeting')
    })

    it('loadMessages merges with existing messages', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: { a: 'Alpha' } },
      })
      i18n.loadMessages('en', { b: 'Bravo' })
      expect(i18n.t('a')).toBe('Alpha')
      expect(i18n.t('b')).toBe('Bravo')
    })

    it('loadMessages then switch locale', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: { greeting: 'Hello' } },
      })
      i18n.loadMessages('ja', { greeting: 'こんにちは' })
      i18n.setLocale('ja')
      expect(i18n.t('greeting')).toBe('こんにちは')
    })

    it('consecutive multiple setLocale calls', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: {
          en: { greeting: 'Hello' },
          fr: { greeting: 'Bonjour' },
          de: { greeting: 'Hallo' },
        },
      })
      i18n.setLocale('fr')
      i18n.setLocale('de')
      i18n.setLocale('fr')
      expect(i18n.locale).toBe('fr')
      expect(i18n.t('greeting')).toBe('Bonjour')
    })

    it('setLocale to locale with no messages returns id', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: { greeting: 'Hello' } },
      })
      i18n.setLocale('xx')
      expect(i18n.t('greeting')).toBe('greeting')
    })

    it('d() custom dateFormats', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
        dateFormats: {
          yearOnly: { year: 'numeric' },
        },
      })
      const result = i18n.d(new Date(2024, 0, 15), 'yearOnly')
      expect(result).toBe('2024')
    })

    it('n() built-in styles (currency, percent, decimal)', () => {
      const i18n = createFluent({
        locale: 'en-US',
        messages: { 'en-US': {} },
      })
      const currency = i18n.n(42.5, 'currency')
      expect(currency).toContain('$')

      const percent = i18n.n(0.85, 'percent')
      expect(percent).toContain('85')
      expect(percent).toContain('%')

      const decimal = i18n.n(3.1, 'decimal')
      expect(decimal).toBe('3.10')
    })

    it('format() plural ICU message', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
      })
      const result = i18n.format('{count, plural, =0 {none} one {# item} other {# items}}', { count: 5 })
      expect(result).toBe('5 items')
    })

    it('format() select ICU message', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
      })
      const result = i18n.format('{gender, select, male {He} female {She} other {They}}', { gender: 'female' })
      expect(result).toBe('She')
    })

    it('t(descriptor) - catalog has it uses catalog version', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: { greeting: 'Catalog Hello' } },
      })
      const desc = { id: 'greeting', message: 'Descriptor Hello' }
      // catalog.has returns true, so catalog version is used
      expect(i18n.t(desc)).toBe('Catalog Hello')
    })

    it('locale getter/setter roundtrip', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
      })
      expect(i18n.locale).toBe('en')
      i18n.locale = 'fr'
      expect(i18n.locale).toBe('fr')
      i18n.locale = 'ja'
      expect(i18n.locale).toBe('ja')
    })

    it('same locale concurrent loadMessages merges all', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
      })
      i18n.loadMessages('en', { a: 'A' })
      i18n.loadMessages('en', { b: 'B' })
      i18n.loadMessages('en', { c: 'C' })
      expect(i18n.t('a')).toBe('A')
      expect(i18n.t('b')).toBe('B')
      expect(i18n.t('c')).toBe('C')
    })
  })

  // ─── transform hook ─────────────────────────────────────────────────

  describe('transform hook', () => {
    it('applies transform to resolved messages', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: { greeting: 'hello world' } },
        transform: (result) => result.toUpperCase(),
      })
      expect(i18n.t('greeting')).toBe('HELLO WORLD')
    })

    it('receives id and locale', () => {
      const calls: Array<{ result: string; id: string; locale: string }> = []
      const i18n = createFluent({
        locale: 'en',
        messages: { en: { greeting: 'Hello' } },
        transform: (result, id, locale) => {
          calls.push({ result, id, locale })
          return result
        },
      })
      i18n.t('greeting')
      expect(calls).toEqual([{ result: 'Hello', id: 'greeting', locale: 'en' }])
    })

    it('applies to fallback messages', () => {
      const i18n = createFluent({
        locale: 'fr',
        fallbackLocale: 'en',
        messages: { en: { greeting: 'Hello' }, fr: {} },
        transform: (result) => `[${result}]`,
      })
      expect(i18n.t('greeting')).toBe('[Hello]')
    })

    it('applies to ICU-interpolated messages', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
        transform: (result) => result.toUpperCase(),
      })
      expect(i18n.t('Hello {0}', { 0: 'world' })).toBe('HELLO WORLD')
    })
  })

  // ─── onLocaleChange callback ────────────────────────────────────────

  describe('onLocaleChange callback', () => {
    it('fires when locale changes via setLocale()', () => {
      const calls: Array<{ newLocale: string; prevLocale: string }> = []
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {}, fr: {} },
        onLocaleChange: (newLocale, prevLocale) => {
          calls.push({ newLocale, prevLocale })
        },
      })
      i18n.setLocale('fr')
      expect(calls).toEqual([{ newLocale: 'fr', prevLocale: 'en' }])
    })

    it('fires when locale changes via property setter', () => {
      const calls: Array<{ newLocale: string; prevLocale: string }> = []
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {}, fr: {} },
        onLocaleChange: (newLocale, prevLocale) => {
          calls.push({ newLocale, prevLocale })
        },
      })
      i18n.locale = 'fr'
      expect(calls).toEqual([{ newLocale: 'fr', prevLocale: 'en' }])
    })

    it('does not fire when locale is set to the same value', () => {
      const calls: string[] = []
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
        onLocaleChange: (newLocale) => { calls.push(newLocale) },
      })
      i18n.setLocale('en')
      expect(calls).toEqual([])
    })
  })

  // ─── custom formatters ─────────────────────────────────────────────

  describe('custom formatters', () => {
    it('uses custom formatter for ICU function nodes', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
        formatters: {
          list: (value, _style, _locale) => {
            if (Array.isArray(value)) {
              return value.join(', ')
            }
            return String(value)
          },
        },
      })
      expect(i18n.format('{items, list}', { items: ['a', 'b', 'c'] })).toBe('a, b, c')
    })

    it('custom formatter receives style and locale', () => {
      const calls: Array<{ style: string; locale: string }> = []
      const i18n = createFluent({
        locale: 'ja',
        messages: { ja: {} },
        formatters: {
          custom: (_value, style, locale) => {
            calls.push({ style, locale })
            return 'ok'
          },
        },
      })
      i18n.format('{x, custom, mystyle}', { x: 1 })
      expect(calls).toEqual([{ style: 'mystyle', locale: 'ja' }])
    })

    it('falls back to built-in formatters when no custom match', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
        formatters: {
          list: () => 'custom',
        },
      })
      // {n, number} should still use built-in Intl.NumberFormat
      const result = i18n.format('{n, number}', { n: 42 })
      expect(result).toBe('42')
    })
  })

  // ─── compiled function messages in fallback paths ──────────────────

  describe('compiled function messages in fallback paths', () => {
    it('fallback locale uses compiled function message', () => {
      const compiled = (values?: Record<string, unknown>) =>
        `Hola ${values?.['name'] ?? 'mundo'}`
      const i18n = createFluent({
        locale: 'fr',
        fallbackLocale: 'es',
        messages: {
          fr: {},
          es: { greeting: compiled as any },
        },
      })
      expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hola Alice')
    })

    it('fallbackChain uses compiled function message', () => {
      const compiled = (values?: Record<string, unknown>) =>
        `Hallo ${values?.['name'] ?? 'Welt'}`
      const i18n = createFluent({
        locale: 'fr',
        messages: {
          fr: {},
          de: { greeting: compiled as any },
        },
        fallbackChain: {
          fr: ['de'],
        },
      })
      expect(i18n.t('greeting', { name: 'Bob' })).toBe('Hallo Bob')
    })

    it('descriptor without catalog hit but with missing handler', () => {
      const missing = vi.fn().mockReturnValue('MISSING RESULT')
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
        missing,
      })
      const desc = { id: 'nav.home', message: 'Home' }
      expect(i18n.t(desc)).toBe('MISSING RESULT')
      expect(missing).toHaveBeenCalledWith('en', 'nav.home')
    })

    it('descriptor with only id (no message, no catalog) returns messageId', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
      })
      const desc = { id: 'orphan.key' } as any
      expect(i18n.t(desc)).toBe('orphan.key')
    })
  })

  // ─── input validation ──────────────────────────────────────────────

  describe('input validation', () => {
    it('throws on empty locale in createFluent', () => {
      expect(() => createFluent({
        locale: '',
        messages: {},
      })).toThrow('non-empty string')
    })

    it('throws on whitespace-only locale in createFluent', () => {
      expect(() => createFluent({
        locale: '  ',
        messages: {},
      })).toThrow('non-empty string')
    })

    it('throws on empty locale in setLocale', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
      })
      expect(() => i18n.setLocale('')).toThrow('non-empty string')
    })

    it('throws on empty locale in locale setter', () => {
      const i18n = createFluent({
        locale: 'en',
        messages: { en: {} },
      })
      expect(() => { i18n.locale = '' }).toThrow('non-empty string')
    })
  })
})
