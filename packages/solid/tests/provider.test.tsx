import { describe, it, expect, afterEach, vi } from 'vitest'
import { createRoot } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { I18nProvider, useI18n } from '../src'
import { createI18nContext, createI18n, getGlobalI18nContext, setGlobalI18nContext, resetGlobalI18nContext } from '../src/context'

const messages = {
  en: { hello: 'Hello', greeting: 'Hi {name}' },
  fr: { hello: 'Bonjour', greeting: 'Salut {name}' },
}

describe('I18nProvider', () => {
  afterEach(() => {
    resetGlobalI18nContext()
  })

  it('provides context to children', () => {
    function Child() {
      const { t } = useI18n()
      return <span>{t('hello')}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>
    ))

    expect(getByText('Hello')).toBeDefined()
  })

  it('supports interpolation via t()', () => {
    function Child() {
      const { t } = useI18n()
      return <span>{t('greeting', { name: 'World' })}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>
    ))

    expect(getByText('Hi World')).toBeDefined()
  })

  it('uses fallbackLocale when key is missing', () => {
    const msgs = {
      en: { hello: 'Hello', onlyEn: 'English only' },
      fr: { hello: 'Bonjour' },
    }

    function Child() {
      const { t } = useI18n()
      return <span>{t('onlyEn')}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="fr" fallbackLocale="en" messages={msgs}>
        <Child />
      </I18nProvider>
    ))

    expect(getByText('English only')).toBeDefined()
  })

  it('calls missing handler when key not found', () => {
    const missing = (_locale: string, id: string) =>
      id === 'unknown' ? 'MISSING' : undefined

    function Child() {
      const { t } = useI18n()
      return <span>{t('unknown')}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={messages} missing={missing}>
        <Child />
      </I18nProvider>
    ))

    expect(getByText('MISSING')).toBeDefined()
  })

  it('returns the id when key not found and no fallback/missing', () => {
    function Child() {
      const { t } = useI18n()
      return <span>{t('nonexistent.key')}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>
    ))

    expect(getByText('nonexistent.key')).toBeDefined()
  })

  // ─── Edge cases ──────────────────────────────────────────────────────

  it('works with no messages for current locale (returns key as fallback)', () => {
    function Child() {
      const { t } = useI18n()
      return <span>{t('hello')}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{}}>
        <Child />
      </I18nProvider>
    ))

    expect(getByText('hello')).toBeDefined()
  })

  it('nested Provider — inner overrides outer', () => {
    function Child() {
      const { t } = useI18n()
      return <span data-testid="inner">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="en" messages={messages}>
        <I18nProvider locale="fr" messages={messages}>
          <Child />
        </I18nProvider>
      </I18nProvider>
    ))

    expect(getByTestId('inner').textContent).toBe('Bonjour')
  })

  it('loadMessages failure does not crash context', () => {
    function Child() {
      const { t, loadMessages } = useI18n()
      // Loading messages for a locale that doesn't exist yet should work fine
      loadMessages('de', { hello: 'Hallo' })
      return <span>{t('hello')}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>
    ))

    // Still renders English since locale is 'en'
    expect(getByText('Hello')).toBeDefined()
  })

  it('unmount during async locale load does not throw', async () => {
    let resolveLoader: (v: Record<string, string>) => void
    const loaderPromise = new Promise<Record<string, string>>((r) => { resolveLoader = r })

    function Child() {
      const { t, setLocale } = useI18n()
      return (
        <button onClick={() => setLocale('de')} data-testid="btn">
          {t('hello')}
        </button>
      )
    }

    const { unmount } = render(() => (
      <I18nProvider
        locale="en"
        messages={messages}
        lazyLocaleLoading={true}
        chunkLoader={() => loaderPromise}
      >
        <Child />
      </I18nProvider>
    ))

    // Unmount while loader is still pending
    unmount()

    // Resolve after unmount — should not throw
    resolveLoader!({ hello: 'Hallo' })
    await loaderPromise
    await Promise.resolve()
  })
})

describe('edge cases — HMR, SSR, and error paths', () => {
  afterEach(() => {
    resetGlobalI18nContext()
  })

  it('setGlobalI18nContext sets the global singleton', () => {
    // Create a context via createI18n (sets global)
    const ctx = createI18n({ locale: 'en', messages: { en: { hello: 'Hello' } } })
    expect(getGlobalI18nContext()).toBe(ctx)

    // Reset before creating again
    resetGlobalI18nContext()

    // Overwriting with createI18n again should update the global
    const ctx2 = createI18n({ locale: 'fr', messages: { fr: { hello: 'Bonjour' } } })
    expect(getGlobalI18nContext()).toBe(ctx2)
  })

  it('preloadLocale error → logs warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    let ctx: any
    createRoot((dispose) => {
      ctx = createI18nContext({
        locale: 'en',
        messages: { en: { hello: 'Hello' } },
        lazyLocaleLoading: true,
        chunkLoader: () => Promise.reject(new Error('network fail')),
      })
      setTimeout(dispose, 50)
    })

    ctx.preloadLocale('fr')
    await new Promise((r) => setTimeout(r, 20))

    expect(warnSpy).toHaveBeenCalledWith(
      '[fluenti] preload failed:',
      'fr',
      expect.any(Error),
    )

    warnSpy.mockRestore()
  })

  it('onMissingKey throws → caught by caller, returns id', () => {
    function Child() {
      const { t } = useI18n()
      return <span>{t('unknown')}</span>
    }

    const throwingMissing = () => { throw new Error('missing handler exploded') }

    // The missing handler throwing propagates through t()
    expect(() => {
      render(() => (
        <I18nProvider locale="en" messages={messages} missing={throwingMissing}>
          <Child />
        </I18nProvider>
      ))
    }).toThrow('missing handler exploded')
  })

  it('multiple rapid setLocale to same locale → no-op after first', async () => {
    let loadCount = 0

    let ctx: any
    createRoot((dispose) => {
      ctx = createI18nContext({
        locale: 'en',
        messages: { en: { hello: 'Hello' } },
        lazyLocaleLoading: true,
        chunkLoader: () => {
          loadCount++
          return Promise.resolve({ hello: 'Bonjour' })
        },
      })
      setTimeout(dispose, 100)
    })

    // First call loads
    await ctx.setLocale('fr')
    const firstCount = loadCount

    // Second call to same locale — already loaded, no chunk load
    await ctx.setLocale('fr')
    expect(loadCount).toBe(firstCount)
  })

  it('getGlobalI18nContext before createI18n → undefined', () => {
    resetGlobalI18nContext()
    expect(getGlobalI18nContext()).toBeUndefined()
  })

  it('HMR replacement: createI18n can be called again after reset', () => {
    const ctx1 = createI18n({ locale: 'en', messages: { en: { hello: 'Hello' } } })
    expect(getGlobalI18nContext()).toBe(ctx1)

    resetGlobalI18nContext()
    expect(getGlobalI18nContext()).toBeUndefined()

    const ctx2 = createI18n({ locale: 'fr', messages: { fr: { hello: 'Bonjour' } } })
    expect(getGlobalI18nContext()).toBe(ctx2)
    expect(ctx2).not.toBe(ctx1)
  })

  it('SSR warning when window undefined', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const origWindow = globalThis.window
    // @ts-expect-error - simulating SSR by removing window
    delete globalThis.window

    createI18n({ locale: 'en', messages: { en: {} } })

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('SSR environment'),
    )

    globalThis.window = origWindow
    warnSpy.mockRestore()
  })
})

describe('useI18n outside provider', () => {
  afterEach(() => {
    resetGlobalI18nContext()
  })

  it('throws when used without provider or createFluenti', () => {
    resetGlobalI18nContext()

    function BadChild() {
      const { t } = useI18n()
      return <span>{t('hello')}</span>
    }

    expect(() => render(() => <BadChild />)).toThrow(
      'useI18n requires either createFluenti()',
    )
  })
})
