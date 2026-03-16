import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock React.cache — in tests we simulate per-request scoping by memoizing
// the factory result (same behavior as within a single request).
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual as any,
    cache: (fn: () => unknown) => {
      let value: unknown
      return () => {
        if (value === undefined) value = fn()
        return value
      }
    },
  }
})

describe('__getServerI18n', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws when configureServerI18n has not been called', async () => {
    const { __getServerI18n } = await import('../src/server')

    expect(() => __getServerI18n()).toThrow(
      '[fluenti] Server i18n not configured',
    )
  })

  it('throws with helpful message mentioning configureServerI18n', async () => {
    const { __getServerI18n } = await import('../src/server')

    expect(() => __getServerI18n()).toThrow('configureServerI18n()')
  })

  it('returns i18n instance after configureServerI18n + setLocale', async () => {
    const { configureServerI18n, __getServerI18n } = await import('../src/server')

    const { setLocale } = configureServerI18n({
      loadMessages: async () => ({
        'Hello': 'Hello',
      }),
      fallbackLocale: 'en',
    })

    await setLocale('en')

    const i18n = __getServerI18n()
    expect(i18n).toBeDefined()
    expect(i18n.locale).toBe('en')
    expect(i18n.t('Hello')).toBe('Hello')
  })

  it('throws when setLocale has not been awaited', async () => {
    const { configureServerI18n, __getServerI18n } = await import('../src/server')

    configureServerI18n({
      loadMessages: async () => ({}),
    })

    // configureServerI18n was called, but setLocale was not
    // getI18nSync should throw because no instance is cached
    expect(() => __getServerI18n()).toThrow()
  })
})

describe('configureServerI18n', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('wraps setLocale to be async and pre-load messages', async () => {
    const { configureServerI18n } = await import('../src/server')
    const loadMessages = vi.fn(async () => ({ 'Hi': 'Hi' }))

    const { setLocale } = configureServerI18n({ loadMessages })

    const result = setLocale('en')
    expect(result).toBeInstanceOf(Promise)
    await result

    // loadMessages should have been called to pre-load
    expect(loadMessages).toHaveBeenCalledWith('en')
  })

  it('returns all properties from createServerI18n', async () => {
    const { configureServerI18n } = await import('../src/server')

    const serverI18n = configureServerI18n({
      loadMessages: async () => ({}),
    })

    expect(serverI18n).toHaveProperty('setLocale')
    expect(serverI18n).toHaveProperty('getI18n')
    expect(serverI18n).toHaveProperty('getI18nSync')
    expect(serverI18n).toHaveProperty('Trans')
    expect(serverI18n).toHaveProperty('Plural')
    expect(serverI18n).toHaveProperty('DateTime')
    expect(serverI18n).toHaveProperty('NumberFormat')
  })
})
