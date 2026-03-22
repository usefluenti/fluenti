/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'
import { createFluenti, createI18n, resetGlobalFluentiContext } from '../src/context'

const messages = {
  en: { hello: 'Hello', greeting: 'Hi {name}' },
  fr: { hello: 'Bonjour' },
}

describe('SSR', () => {
  it('createFluenti works in a non-browser environment', () => {
    const ctx = createFluenti({ locale: 'en', messages })

    expect(ctx.t('hello')).toBe('Hello')
    expect(ctx.t('greeting', { name: 'World' })).toBe('Hi World')
  })

  it('locale accessor returns current locale', () => {
    const ctx = createFluenti({ locale: 'en', messages })
    expect(ctx.locale()).toBe('en')
  })

  it('setLocale changes the active locale', () => {
    const ctx = createFluenti({ locale: 'en', messages })
    expect(ctx.t('hello')).toBe('Hello')

    ctx.setLocale('fr')
    expect(ctx.t('hello')).toBe('Bonjour')
  })

  it('per-context isolation — two contexts are independent', () => {
    const ctxEn = createFluenti({ locale: 'en', messages })
    const ctxFr = createFluenti({ locale: 'fr', messages })

    expect(ctxEn.t('hello')).toBe('Hello')
    expect(ctxFr.t('hello')).toBe('Bonjour')
  })

  it('fallback works in SSR context', () => {
    const ctx = createFluenti({
      locale: 'fr',
      fallbackLocale: 'en',
      messages: {
        en: { onlyEn: 'English only' },
        fr: {},
      },
    })

    expect(ctx.t('onlyEn')).toBe('English only')
  })

  it('format() interpolates in SSR context', () => {
    const ctx = createFluenti({ locale: 'en', messages })
    const result = ctx.format('Hello {name}', { name: 'SSR' })
    expect(result).toBe('Hello SSR')
  })

  it('getLocales returns available locale codes', () => {
    const ctx = createFluenti({ locale: 'en', messages })
    const locales = ctx.getLocales()
    expect(locales).toContain('en')
    expect(locales).toContain('fr')
  })

  it('loadMessages adds messages in SSR context', () => {
    const ctx = createFluenti({ locale: 'en', messages: { en: {} } })
    ctx.loadMessages('en', { dynamic: 'Dynamic value' })
    expect(ctx.t('dynamic')).toBe('Dynamic value')
  })

  it('createI18n() warns about SSR singleton in non-browser environment', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    resetGlobalFluentiContext()

    const ctx = createI18n({ locale: 'en', messages })

    expect(warnSpy).toHaveBeenCalledWith(
      '[fluenti] createI18n() detected SSR environment. ' +
      'Use <I18nProvider> for per-request isolation in SSR.',
    )
    expect(ctx.t('hello')).toBe('Hello')

    warnSpy.mockRestore()
    resetGlobalFluentiContext()
  })

  // ─── Edge cases ──────────────────────────────────────────────────────

  it('per-request isolation — two contexts do not interfere', () => {
    const ctxA = createFluenti({ locale: 'en', messages })
    const ctxB = createFluenti({ locale: 'fr', messages })

    // Changing ctxA should not affect ctxB
    ctxA.setLocale('fr')
    ctxB.setLocale('en')

    expect(ctxA.locale()).toBe('fr')
    expect(ctxB.locale()).toBe('en')
    expect(ctxA.t('hello')).toBe('Bonjour')
    expect(ctxB.t('hello')).toBe('Hello')
  })

  it('locale signal is reactive in SSR context', () => {
    const ctx = createFluenti({ locale: 'en', messages })

    expect(ctx.locale()).toBe('en')
    expect(ctx.t('hello')).toBe('Hello')

    ctx.setLocale('fr')
    expect(ctx.locale()).toBe('fr')
    expect(ctx.t('hello')).toBe('Bonjour')

    ctx.setLocale('en')
    expect(ctx.locale()).toBe('en')
    expect(ctx.t('hello')).toBe('Hello')
  })
})
