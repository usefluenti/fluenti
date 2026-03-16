import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import type { Messages } from '@fluenti/core'
import { createServerI18n } from '../src/server'

const enMessages = { greeting: 'Hello', farewell: 'Goodbye' }
const deMessages = { greeting: 'Hallo', farewell: 'Auf Wiedersehen' }

describe('createServerI18n', () => {
  let loadMessages: Mock<(locale: string) => Promise<Messages | { default: Messages }>>

  beforeEach(() => {
    vi.clearAllMocks()
    loadMessages = vi.fn(async (locale: string) => {
      if (locale === 'en') return enMessages
      if (locale === 'de') return deMessages
      throw new Error(`Unknown locale: ${locale}`)
    })
  })

  it('should throw if getI18n is called before setLocale without resolveLocale', async () => {
    const { getI18n } = createServerI18n({ loadMessages })
    await expect(getI18n()).rejects.toThrow('No locale set')
  })

  it('should return a working i18n instance after setLocale', async () => {
    const { setLocale, getI18n } = createServerI18n({ loadMessages })
    setLocale('en')
    const i18n = await getI18n()

    expect(i18n.locale).toBe('en')
    expect(i18n.t('greeting')).toBe('Hello')
    expect(i18n.t('farewell')).toBe('Goodbye')
  })

  it('should load messages only once per locale per request', async () => {
    const { setLocale, getI18n } = createServerI18n({ loadMessages })
    setLocale('en')
    await getI18n()
    await getI18n()

    // loadMessages should be called only once for 'en'
    expect(loadMessages).toHaveBeenCalledTimes(1)
    expect(loadMessages).toHaveBeenCalledWith('en')
  })

  it('should handle { default: Messages } module format', async () => {
    const loader = vi.fn(async () => ({ default: enMessages }))
    const { setLocale, getI18n } = createServerI18n({ loadMessages: loader })
    setLocale('en')
    const i18n = await getI18n()

    expect(i18n.t('greeting')).toBe('Hello')
  })

  it('should load fallback locale messages alongside current locale', async () => {
    const { setLocale, getI18n } = createServerI18n({
      loadMessages,
      fallbackLocale: 'en',
    })
    setLocale('de')
    const i18n = await getI18n()

    expect(i18n.t('greeting')).toBe('Hallo')
    // loadMessages called for both 'de' and 'en'
    expect(loadMessages).toHaveBeenCalledWith('de')
    expect(loadMessages).toHaveBeenCalledWith('en')
  })

  it('should not load fallback if it matches current locale', async () => {
    const { setLocale, getI18n } = createServerI18n({
      loadMessages,
      fallbackLocale: 'en',
    })
    setLocale('en')
    await getI18n()

    expect(loadMessages).toHaveBeenCalledTimes(1)
  })

  it('should fall back to fallbackLocale for missing keys', async () => {
    const sparseLoader = vi.fn(async (locale: string) => {
      if (locale === 'de') return { greeting: 'Hallo' }
      if (locale === 'en') return enMessages
      throw new Error(`Unknown locale: ${locale}`)
    })
    const { setLocale, getI18n } = createServerI18n({
      loadMessages: sparseLoader,
      fallbackLocale: 'en',
    })
    setLocale('de')
    const i18n = await getI18n()

    expect(i18n.t('greeting')).toBe('Hallo')
    expect(i18n.t('farewell')).toBe('Goodbye') // falls back to en
  })

  it('should support date formatting', async () => {
    const { setLocale, getI18n } = createServerI18n({ loadMessages })
    setLocale('en')
    const i18n = await getI18n()

    const result = i18n.d(new Date(2024, 0, 15))
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('should support number formatting', async () => {
    const { setLocale, getI18n } = createServerI18n({ loadMessages })
    setLocale('en')
    const i18n = await getI18n()

    const result = i18n.n(1234.56)
    expect(result).toContain('1')
    expect(result).toContain('234')
  })

  it('should pass custom missing handler', async () => {
    const missing = vi.fn(() => 'MISSING')
    const { setLocale, getI18n } = createServerI18n({
      loadMessages,
      missing,
    })
    setLocale('en')
    const i18n = await getI18n()

    expect(i18n.t('nonexistent.key')).toBe('MISSING')
    expect(missing).toHaveBeenCalledWith('en', 'nonexistent.key')
  })

  // ─── resolveLocale scenarios ─────────────────────────────────────
  describe('resolveLocale', () => {
    it('should auto-resolve locale when setLocale was not called', async () => {
      const resolveLocale = vi.fn(() => 'de')
      const { getI18n } = createServerI18n({ loadMessages, resolveLocale })
      const i18n = await getI18n()

      expect(resolveLocale).toHaveBeenCalledTimes(1)
      expect(i18n.locale).toBe('de')
      expect(i18n.t('greeting')).toBe('Hallo')
    })

    it('should support async resolveLocale', async () => {
      const resolveLocale = vi.fn(async () => 'en')
      const { getI18n } = createServerI18n({ loadMessages, resolveLocale })
      const i18n = await getI18n()

      expect(i18n.locale).toBe('en')
      expect(i18n.t('greeting')).toBe('Hello')
    })

    it('should prefer setLocale over resolveLocale when both available', async () => {
      const resolveLocale = vi.fn(() => 'en')
      const { setLocale, getI18n } = createServerI18n({ loadMessages, resolveLocale })
      setLocale('de')
      const i18n = await getI18n()

      expect(resolveLocale).not.toHaveBeenCalled()
      expect(i18n.locale).toBe('de')
    })

    it('should include resolveLocale hint in error message when not configured', async () => {
      const { getI18n } = createServerI18n({ loadMessages })
      await expect(getI18n()).rejects.toThrow('resolveLocale')
    })

    it('should handle resolveLocale that throws', async () => {
      const resolveLocale = vi.fn(() => { throw new Error('resolver failed') })
      const { getI18n } = createServerI18n({ loadMessages, resolveLocale })
      await expect(getI18n()).rejects.toThrow('resolver failed')
    })
  })

  // ─── Instance caching ─────────────────────────────────────────────
  describe('instance caching', () => {
    it('should return the same instance for repeated getI18n calls', async () => {
      const { setLocale, getI18n } = createServerI18n({ loadMessages })
      setLocale('en')
      const i18n1 = await getI18n()
      const i18n2 = await getI18n()

      expect(i18n1).toBe(i18n2)
    })
  })

  describe('edge cases', () => {
    it('loadMessages returns rejected promise', async () => {
      const failLoader = vi.fn(async () => { throw new Error('network error') })
      const { setLocale, getI18n } = createServerI18n({ loadMessages: failLoader })
      setLocale('en')

      await expect(getI18n()).rejects.toThrow('network error')
    })

    it('locale change creates new instance', async () => {
      const { setLocale, getI18n } = createServerI18n({ loadMessages })
      setLocale('en')
      const i18n1 = await getI18n()

      setLocale('de')
      const i18n2 = await getI18n()

      expect(i18n1).not.toBe(i18n2)
      expect(i18n2.locale).toBe('de')
    })

    it('passes fallbackChain', async () => {
      const chainLoader = vi.fn(async (locale: string) => {
        if (locale === 'pt-BR') return {}
        if (locale === 'pt') return { hello: 'Olá' }
        if (locale === 'en') return { hello: 'Hello' }
        return {}
      })
      const { setLocale, getI18n } = createServerI18n({
        loadMessages: chainLoader,
        fallbackChain: { 'pt-BR': ['pt', 'en'] },
      })
      setLocale('pt-BR')
      const i18n = await getI18n()

      // The instance is created with fallbackChain config
      expect(i18n.locale).toBe('pt-BR')
    })

    it('passes dateFormats', async () => {
      const { setLocale, getI18n } = createServerI18n({
        loadMessages,
        dateFormats: {
          custom: { year: '2-digit', month: '2-digit' },
        },
      })
      setLocale('en')
      const i18n = await getI18n()

      const result = i18n.d(new Date(2024, 0, 15), 'custom')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('passes numberFormats', async () => {
      const { setLocale, getI18n } = createServerI18n({
        loadMessages,
        numberFormats: {
          compact: { notation: 'compact' as const },
        },
      })
      setLocale('en')
      const i18n = await getI18n()

      const result = i18n.n(1500, 'compact')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
