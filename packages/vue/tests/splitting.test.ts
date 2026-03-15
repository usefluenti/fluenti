import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { createFluentVue } from '../src/plugin'

function createSplitPlugin(chunkLoader: (locale: string) => Promise<Record<string, any>>) {
  return createFluentVue({
    locale: 'en',
    messages: { en: { hello: 'Hello', bye: 'Goodbye' } },
    splitting: true,
    chunkLoader,
  })
}

describe('splitting mode', () => {
  it('setLocale on already-loaded locale is instant, no isLoading flicker', async () => {
    const loader = vi.fn()
    const plugin = createSplitPlugin(loader)
    const { global: ctx } = plugin

    // 'en' is already loaded (initial locale)
    await ctx.setLocale('en')

    expect(ctx.isLoading.value).toBe(false)
    expect(loader).not.toHaveBeenCalled()
    expect(ctx.locale.value).toBe('en')
  })

  it('setLocale on unloaded locale triggers isLoading', async () => {
    let resolveLoader: (v: any) => void
    const loaderPromise = new Promise((r) => { resolveLoader = r })
    const loader = vi.fn().mockReturnValue(loaderPromise)
    const plugin = createSplitPlugin(loader)
    const { global: ctx } = plugin

    const setLocalePromise = ctx.setLocale('fr')

    expect(ctx.isLoading.value).toBe(true)

    resolveLoader!({ hello: 'Bonjour', bye: 'Au revoir' })
    await setLocalePromise

    expect(ctx.isLoading.value).toBe(false)
    expect(ctx.locale.value).toBe('fr')
    expect(ctx.t('hello')).toBe('Bonjour')
  })

  it('t() returns fallback locale text during loading', async () => {
    let resolveLoader: (v: any) => void
    const loaderPromise = new Promise((r) => { resolveLoader = r })
    const loader = vi.fn().mockReturnValue(loaderPromise)
    const plugin = createSplitPlugin(loader)
    const { global: ctx } = plugin

    // Start loading fr
    const setLocalePromise = ctx.setLocale('fr')

    // During loading, locale is still 'en', so fallback works
    expect(ctx.t('hello')).toBe('Hello')

    resolveLoader!({ hello: 'Bonjour' })
    await setLocalePromise

    expect(ctx.t('hello')).toBe('Bonjour')
  })

  it('preloadLocale does not change locale or isLoading', async () => {
    let resolveLoader: (v: any) => void
    const loaderPromise = new Promise<Record<string, any>>((r) => { resolveLoader = r })
    const loader = vi.fn().mockReturnValue(loaderPromise)
    const plugin = createSplitPlugin(loader)
    const { global: ctx } = plugin

    ctx.preloadLocale('fr')

    expect(ctx.isLoading.value).toBe(false)
    expect(ctx.locale.value).toBe('en')

    resolveLoader!({ hello: 'Bonjour' })
    // Wait for microtask
    await new Promise((r) => setTimeout(r, 0))

    expect(ctx.locale.value).toBe('en')
    expect(ctx.loadedLocales.value.has('fr')).toBe(true)
  })

  it('preloadLocale then setLocale is instant', async () => {
    const frMessages = { hello: 'Bonjour', bye: 'Au revoir' }
    const loader = vi.fn().mockResolvedValue(frMessages)
    const plugin = createSplitPlugin(loader)
    const { global: ctx } = plugin

    ctx.preloadLocale('fr')
    await new Promise((r) => setTimeout(r, 0))

    // Now setLocale should be instant (already loaded)
    await ctx.setLocale('fr')

    expect(ctx.locale.value).toBe('fr')
    expect(ctx.t('hello')).toBe('Bonjour')
    // Loader called only once (during preload, not during setLocale)
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('preloadLocale failure is silent', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('network error'))
    const plugin = createSplitPlugin(loader)
    const { global: ctx } = plugin

    // Should not throw
    ctx.preloadLocale('fr')
    await new Promise((r) => setTimeout(r, 0))

    expect(ctx.loadedLocales.value.has('fr')).toBe(false)
  })

  it('chunk loader is called only once per locale (cached)', async () => {
    const loader = vi.fn().mockResolvedValue({ hello: 'Bonjour' })
    const plugin = createSplitPlugin(loader)
    const { global: ctx } = plugin

    await ctx.setLocale('fr')
    await ctx.setLocale('en')
    await ctx.setLocale('fr')

    expect(loader).toHaveBeenCalledTimes(1)
    expect(loader).toHaveBeenCalledWith('fr')
  })

  it('without splitting, setLocale is synchronous', async () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
    })

    await plugin.global.setLocale('fr')
    expect(plugin.global.locale.value).toBe('fr')
    expect(plugin.global.isLoading.value).toBe(false)
  })

  it('loadedLocales includes initial locale', () => {
    const plugin = createSplitPlugin(vi.fn())
    expect(plugin.global.loadedLocales.value.has('en')).toBe(true)
  })
})
