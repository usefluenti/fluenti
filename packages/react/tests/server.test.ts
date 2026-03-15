import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createServerI18n } from '../src/server'

// Mock React.cache — in a real RSC environment React.cache scopes to the
// current request. In tests we simulate this by letting the mock just call
// the factory once (the same behaviour within a single request).
vi.mock('react', () => ({
  cache: (fn: () => unknown) => {
    let value: unknown
    return () => {
      if (value === undefined) value = fn()
      return value
    }
  },
}))

const enMessages = { greeting: 'Hello', farewell: 'Goodbye' }
const deMessages = { greeting: 'Hallo', farewell: 'Auf Wiedersehen' }

describe('createServerI18n', () => {
  let loadMessages: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    loadMessages = vi.fn(async (locale: string) => {
      if (locale === 'en') return enMessages
      if (locale === 'de') return deMessages
      throw new Error(`Unknown locale: ${locale}`)
    })
  })

  it('should throw if getI18n is called before setLocale', async () => {
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
    // de only has 'greeting', fallback en has both
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
})
