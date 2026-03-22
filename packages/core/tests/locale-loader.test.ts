import { describe, it, expect, vi } from 'vitest'
import { createLocaleLoader } from '../src/locale-loader'
import type { Messages } from '../src/types'

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('createLocaleLoader', () => {
  it('initializes with given locale and messages', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })
    expect(loader.getLocale()).toBe('en')
    expect(loader.getLoadedLocales()).toContain('en')
    expect(loader.isLoading()).toBe(false)
  })

  it('setLocale switches instantly when messages are preloaded', async () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
    })
    await loader.setLocale('fr')
    expect(loader.getLocale()).toBe('fr')
  })

  it('setLocale loads messages asynchronously', async () => {
    const loadMessages = vi.fn(async (locale: string): Promise<Messages> => {
      return locale === 'ja' ? { hello: 'こんにちは' } : {}
    })
    const onLocaleChange = vi.fn()
    const onLoadingChange = vi.fn()

    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
      loadMessages,
      onLocaleChange,
      onLoadingChange,
    })

    await loader.setLocale('ja')
    expect(loader.getLocale()).toBe('ja')
    expect(loadMessages).toHaveBeenCalledWith('ja')
    expect(onLocaleChange).toHaveBeenCalledWith('ja')
    expect(loader.getLoadedLocales()).toContain('ja')
  })

  it('discards stale locale loads (race-condition protection)', async () => {
    let resolveFirst: ((v: Messages) => void) | undefined
    let resolveSecond: ((v: Messages) => void) | undefined
    let callCount = 0

    const loadMessages = vi.fn((): Promise<Messages> => {
      callCount++
      if (callCount === 1) {
        return new Promise(r => { resolveFirst = r })
      }
      return new Promise(r => { resolveSecond = r })
    })

    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
      loadMessages,
    })

    // Start loading 'fr' (slow)
    const p1 = loader.setLocale('fr')
    // Immediately start loading 'de' (fast)
    const p2 = loader.setLocale('de')

    // Resolve 'de' first
    resolveSecond!({ hello: 'Hallo' })
    await p2

    expect(loader.getLocale()).toBe('de')

    // Now resolve 'fr' (stale)
    resolveFirst!({ hello: 'Bonjour' })
    await p1

    // Should still be 'de', not 'fr'
    expect(loader.getLocale()).toBe('de')
  })

  it('preloadLocale loads without switching', async () => {
    const loadMessages = vi.fn(async (): Promise<Messages> => ({ hello: 'Hallo' }))

    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
      loadMessages,
    })

    await loader.preloadLocale('de')
    expect(loader.getLocale()).toBe('en') // didn't switch
    expect(loader.getLoadedLocales()).toContain('de')
  })

  it('preloadLocale skips already loaded locales', async () => {
    const loadMessages = vi.fn(async (): Promise<Messages> => ({}))

    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
      loadMessages,
    })

    await loader.preloadLocale('en')
    expect(loadMessages).not.toHaveBeenCalled()
  })

  it('loadMessages adds messages synchronously', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    loader.loadMessages('de', { hello: 'Hallo' })
    expect(loader.getLoadedLocales()).toContain('de')
    expect(loader.te('hello', 'de')).toBe(true)
  })

  it('te returns true for existing key', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })
    expect(loader.te('hello')).toBe(true)
    expect(loader.te('missing')).toBe(false)
  })

  it('te checks specific locale', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, fr: { bonjour: 'Bonjour' } },
    })
    expect(loader.te('bonjour', 'fr')).toBe(true)
    expect(loader.te('hello', 'fr')).toBe(false)
  })

  it('tm returns compiled message', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })
    expect(loader.tm('hello')).toBe('Hello')
    expect(loader.tm('missing')).toBeUndefined()
  })

  it('tm checks specific locale', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
    })
    expect(loader.tm('hello', 'fr')).toBe('Bonjour')
  })

  it('resolves module default exports', async () => {
    const loadMessages = vi.fn(async (): Promise<{ default: Messages }> => ({
      default: { hello: 'Hallo' },
    }))

    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
      loadMessages,
    })

    await loader.setLocale('de')
    expect(loader.tm('hello', 'de')).toBe('Hallo')
  })

  it('warns when no loadMessages and locale not found', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    await loader.setLocale('fr')
    expect(loader.getLocale()).toBe('en') // didn't switch
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No messages for locale'))
    warn.mockRestore()
  })
})
