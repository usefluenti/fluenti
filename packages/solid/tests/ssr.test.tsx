/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'solid-js/web'
import { createI18nContext, createI18n, resetGlobalI18nContext } from '../src/context'

const messages = {
  en: { hello: 'Hello', greeting: 'Hi {name}' },
  fr: { hello: 'Bonjour' },
}

describe('SSR', () => {
  it('createI18nContext works in a non-browser environment', () => {
    const ctx = createI18nContext({ locale: 'en', messages })

    expect(ctx.t('hello')).toBe('Hello')
    expect(ctx.t('greeting', { name: 'World' })).toBe('Hi World')
  })

  it('locale accessor returns current locale', () => {
    const ctx = createI18nContext({ locale: 'en', messages })
    expect(ctx.locale()).toBe('en')
  })

  it('setLocale changes the active locale', () => {
    const ctx = createI18nContext({ locale: 'en', messages })
    expect(ctx.t('hello')).toBe('Hello')

    ctx.setLocale('fr')
    expect(ctx.t('hello')).toBe('Bonjour')
  })

  it('per-context isolation — two contexts are independent', () => {
    const ctxEn = createI18nContext({ locale: 'en', messages })
    const ctxFr = createI18nContext({ locale: 'fr', messages })

    expect(ctxEn.t('hello')).toBe('Hello')
    expect(ctxFr.t('hello')).toBe('Bonjour')
  })

  it('fallback works in SSR context', () => {
    const ctx = createI18nContext({
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
    const ctx = createI18nContext({ locale: 'en', messages })
    const result = ctx.format('Hello {name}', { name: 'SSR' })
    expect(result).toBe('Hello SSR')
  })

  it('tRaw() deprecated alias works in SSR context', () => {
    const ctx = createI18nContext({ locale: 'en', messages })
    const result = ctx.tRaw('Hello {name}', { name: 'SSR' })
    expect(result).toBe('Hello SSR')
  })

  it('getLocales returns available locale codes', () => {
    const ctx = createI18nContext({ locale: 'en', messages })
    const locales = ctx.getLocales()
    expect(locales).toContain('en')
    expect(locales).toContain('fr')
  })

  it('loadMessages adds messages in SSR context', () => {
    const ctx = createI18nContext({ locale: 'en', messages: { en: {} } })
    ctx.loadMessages('en', { dynamic: 'Dynamic value' })
    expect(ctx.t('dynamic')).toBe('Dynamic value')
  })

  it('createI18n() warns about SSR singleton in non-browser environment', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    resetGlobalI18nContext()

    const ctx = createI18n({ locale: 'en', messages })

    expect(warnSpy).toHaveBeenCalledWith(
      '[fluenti] createI18n() detected SSR environment. ' +
      'Use <I18nProvider> for per-request isolation in SSR.',
    )
    expect(ctx.t('hello')).toBe('Hello')

    warnSpy.mockRestore()
    resetGlobalI18nContext()
  })
})
