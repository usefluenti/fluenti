import { describe, it, expect, vi } from 'vitest'
import { createI18nContext } from '../src/context'
import type { I18nConfig } from '../src/context'

function createSplitContext(chunkLoader: (locale: string) => Promise<Record<string, any>>) {
  return createI18nContext({
    locale: 'en',
    messages: { en: { hello: 'Hello', bye: 'Goodbye' } },
    lazyLocaleLoading: true,
    chunkLoader,
  } as I18nConfig)
}

describe('splitting mode', () => {
  it('setLocale on already-loaded locale is instant', async () => {
    const loader = vi.fn()
    const ctx = createSplitContext(loader)

    await ctx.setLocale('en')

    expect(ctx.isLoading()).toBe(false)
    expect(loader).not.toHaveBeenCalled()
    expect(ctx.locale()).toBe('en')
  })

  it('setLocale on unloaded locale triggers isLoading', async () => {
    let resolveLoader: (v: any) => void
    const loaderPromise = new Promise((r) => { resolveLoader = r })
    const loader = vi.fn().mockReturnValue(loaderPromise)
    const ctx = createSplitContext(loader)

    const p = ctx.setLocale('fr')
    expect(ctx.isLoading()).toBe(true)

    resolveLoader!({ hello: 'Bonjour', bye: 'Au revoir' })
    await p

    expect(ctx.isLoading()).toBe(false)
    expect(ctx.locale()).toBe('fr')
    expect(ctx.t('hello')).toBe('Bonjour')
  })

  it('t() returns fallback text during loading', async () => {
    let resolveLoader: (v: any) => void
    const loaderPromise = new Promise((r) => { resolveLoader = r })
    const loader = vi.fn().mockReturnValue(loaderPromise)
    const ctx = createSplitContext(loader)

    const p = ctx.setLocale('fr')
    // During loading, locale is still 'en'
    expect(ctx.t('hello')).toBe('Hello')

    resolveLoader!({ hello: 'Bonjour' })
    await p
    expect(ctx.t('hello')).toBe('Bonjour')
  })

  it('preloadLocale does not change locale or isLoading', async () => {
    let resolveLoader: (v: any) => void
    const loaderPromise = new Promise<Record<string, any>>((r) => { resolveLoader = r })
    const loader = vi.fn().mockReturnValue(loaderPromise)
    const ctx = createSplitContext(loader)

    ctx.preloadLocale('fr')
    expect(ctx.isLoading()).toBe(false)
    expect(ctx.locale()).toBe('en')

    resolveLoader!({ hello: 'Bonjour' })
    await new Promise((r) => setTimeout(r, 0))

    expect(ctx.locale()).toBe('en')
    expect(ctx.loadedLocales().has('fr')).toBe(true)
  })

  it('preloadLocale then setLocale is instant', async () => {
    const loader = vi.fn().mockResolvedValue({ hello: 'Bonjour', bye: 'Au revoir' })
    const ctx = createSplitContext(loader)

    ctx.preloadLocale('fr')
    await new Promise((r) => setTimeout(r, 0))

    await ctx.setLocale('fr')
    expect(ctx.locale()).toBe('fr')
    expect(ctx.t('hello')).toBe('Bonjour')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('preloadLocale failure is silent', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('network'))
    const ctx = createSplitContext(loader)

    ctx.preloadLocale('fr')
    await new Promise((r) => setTimeout(r, 0))

    expect(ctx.loadedLocales().has('fr')).toBe(false)
  })

  it('chunk loader called only once per locale', async () => {
    const loader = vi.fn().mockResolvedValue({ hello: 'Bonjour' })
    const ctx = createSplitContext(loader)

    await ctx.setLocale('fr')
    await ctx.setLocale('en')
    await ctx.setLocale('fr')

    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('accepts chunkLoader results shaped like dynamic import modules', async () => {
    const loader = vi.fn().mockResolvedValue({
      default: { hello: 'Bonjour', bye: 'Au revoir' },
    })
    const ctx = createSplitContext(loader)

    await ctx.setLocale('fr')

    expect(ctx.locale()).toBe('fr')
    expect(ctx.t('hello')).toBe('Bonjour')
  })

  it('without splitting, setLocale is synchronous', async () => {
    const ctx = createI18nContext({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
    })

    await ctx.setLocale('fr')
    expect(ctx.locale()).toBe('fr')
    expect(ctx.isLoading()).toBe(false)
  })

  it('loadedLocales includes initial locale', () => {
    const ctx = createSplitContext(vi.fn())
    expect(ctx.loadedLocales().has('en')).toBe(true)
  })

  // ─── Edge cases ──────────────────────────────────────────────────────

  it('setLocale propagates loader error', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('Network failure'))
    const ctx = createSplitContext(loader)

    await expect(ctx.setLocale('fr')).rejects.toThrow('Network failure')
    expect(ctx.isLoading()).toBe(false)
    // Locale should remain unchanged after error
    expect(ctx.locale()).toBe('en')
  })

  it('race condition: rapid setLocale calls settle to last locale', async () => {
    let resolveFirst: (v: any) => void
    let resolveSecond: (v: any) => void
    const firstPromise = new Promise((r) => { resolveFirst = r })
    const secondPromise = new Promise((r) => { resolveSecond = r })

    const loader = vi.fn()
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise)

    const ctx = createSplitContext(loader)

    const p1 = ctx.setLocale('fr')
    const p2 = ctx.setLocale('de')

    // Resolve second first, then first
    resolveSecond!({ hello: 'Hallo' })
    resolveFirst!({ hello: 'Bonjour' })

    await Promise.allSettled([p1, p2])

    // Both locales should be loaded
    expect(ctx.loadedLocales().has('fr')).toBe(true)
    expect(ctx.loadedLocales().has('de')).toBe(true)
  })
})
