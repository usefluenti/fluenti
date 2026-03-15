import { describe, it, expect, vi } from 'vitest'
import { createFluent } from '../src/index'
import { msg } from '../src/msg'

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

  it('tRaw() is a deprecated alias for format()', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: { en: {} },
    })
    expect(i18n.tRaw('Hello {name}!', { name: 'World' })).toBe('Hello World!')
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
            `Hello ${values?.name ?? 'stranger'}`) as any,
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
})
