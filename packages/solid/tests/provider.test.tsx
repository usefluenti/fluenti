import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@solidjs/testing-library'
import { interpolate } from '@fluenti/core/internal'
import { I18nProvider, useI18n } from '../src'

const messages = {
  en: { hello: 'Hello', greeting: 'Hi {name}' },
  fr: { hello: 'Bonjour', greeting: 'Salut {name}' },
}

describe('I18nProvider', () => {
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

describe('useI18n outside provider', () => {
  it('throws when used without provider', () => {
    function BadChild() {
      const { t } = useI18n()
      return <span>{t('hello')}</span>
    }

    expect(() => render(() => <BadChild />)).toThrow(
      'useI18n() must be used inside an <I18nProvider>.',
    )
  })
})

describe('interpolate config (#21)', () => {
  it('Provider with ICU plural messages works via core interpolate', () => {
    // Full ICU support (plural, select) requires passing the interpolate function
    function Child() {
      const { t } = useI18n()
      return <span>{t('{count, plural, one {# item} other {# items}}', { count: 1 })}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Child />
      </I18nProvider>
    ))

    expect(getByText('1 item')).toBeDefined()
  })

  it('Provider with ICU select messages works via core interpolate', () => {
    function Child() {
      const { t } = useI18n()
      return <span>{t('{gender, select, male {He} female {She} other {They}}', { gender: 'female' })}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Child />
      </I18nProvider>
    ))

    expect(getByText('She')).toBeDefined()
  })

  it('Provider with simple {key} interpolation in catalog messages', () => {
    function Child() {
      const { t } = useI18n()
      return <span>{t('greeting', { name: 'Alice' })}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: { greeting: 'Hello {name}!' } }}>
        <Child />
      </I18nProvider>
    ))

    expect(getByText('Hello Alice!')).toBeDefined()
  })

  it('format() uses ICU interpolation for direct message strings', () => {
    function Child() {
      const { format } = useI18n()
      return <span>{format('{count, plural, one {# thing} other {# things}}', { count: 1 })}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Child />
      </I18nProvider>
    ))

    expect(getByText('1 thing')).toBeDefined()
  })
})

describe('edge cases (#22)', () => {
  it('Provider with empty messages does not crash', () => {
    function Child() {
      const { t } = useI18n()
      return <span>{t('hello')}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{}}>
        <Child />
      </I18nProvider>
    ))

    // Returns the key itself as fallback
    expect(getByText('hello')).toBeDefined()
  })

  it('Provider with empty locale catalog does not crash', () => {
    function Child() {
      const { t } = useI18n()
      return <span>{t('nonexistent.key')}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Child />
      </I18nProvider>
    ))

    expect(getByText('nonexistent.key')).toBeDefined()
  })

  it('async locale load interrupted by unmount does not throw', async () => {
    let resolveLoader: (v: Record<string, string>) => void
    const loaderPromise = new Promise<Record<string, string>>((r) => { resolveLoader = r })

    function Child() {
      const { t, setLocale } = useI18n()
      // Kick off async locale load
      setLocale('de')
      return <span>{t('hello')}</span>
    }

    const { unmount } = render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
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

  it('nested Providers work correctly with different messages', () => {
    function InnerChild() {
      const { t } = useI18n()
      return <span data-testid="inner">{t('hello')}</span>
    }

    function OuterChild() {
      const { t } = useI18n()
      return <span data-testid="outer">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="en" messages={{ en: { hello: 'Outer Hello' } }}>
        <OuterChild />
        <I18nProvider locale="en" messages={{ en: { hello: 'Inner Hello' } }}>
          <InnerChild />
        </I18nProvider>
      </I18nProvider>
    ))

    expect(getByTestId('outer').textContent).toBe('Outer Hello')
    expect(getByTestId('inner').textContent).toBe('Inner Hello')
  })
})

// ─── #10 loadMessages dual sync ───────────────────────────────────────────────

describe('loadMessages dual sync', () => {
  it('after loadMessages getLocales includes the new locale', () => {
    let locales: string[] = []

    function Child() {
      const { loadMessages, getLocales } = useI18n()
      loadMessages('de', { hello: 'Hallo' })
      locales = getLocales()
      return <span>test</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={{ en: { hello: 'Hello' } }}>
        <Child />
      </I18nProvider>
    ))

    expect(locales).toContain('de')
  })

  it('after loadMessages te(key, new_locale) returns true', () => {
    let result = false

    function Child() {
      const { loadMessages, te } = useI18n()
      loadMessages('de', { hello: 'Hallo' })
      result = te('hello', 'de')
      return <span>test</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={{ en: { hello: 'Hello' } }}>
        <Child />
      </I18nProvider>
    ))

    expect(result).toBe(true)
  })

  it('loadMessages then setLocale renders catalog consistently', async () => {
    let changeLocale: (l: string) => void
    let addMessages: (loc: string, msgs: Record<string, string>) => void

    function Child() {
      const { t, setLocale, loadMessages } = useI18n()
      changeLocale = setLocale
      addMessages = loadMessages
      return <span data-testid="text">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="en" messages={{ en: { hello: 'Hello' } }}>
        <Child />
      </I18nProvider>
    ))

    expect(getByTestId('text').textContent).toBe('Hello')

    addMessages!('de', { hello: 'Hallo' })
    changeLocale!('de')
    await Promise.resolve()

    expect(getByTestId('text').textContent).toBe('Hallo')
  })
})

// ─── #11 preloadLocale ────────────────────────────────────────────────────────

describe('preloadLocale', () => {
  it('calls chunkLoader, updates messages, and calls i18n.loadMessages', async () => {
    const chunkLoader = vi.fn().mockResolvedValue({ hello: 'Hallo' })
    let preload: (loc: string) => void
    let checkTe: (key: string, loc?: string) => boolean

    function Child() {
      const { preloadLocale, te } = useI18n()
      preload = preloadLocale
      checkTe = te
      return <span>test</span>
    }

    render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        lazyLocaleLoading={true}
        chunkLoader={chunkLoader}
      >
        <Child />
      </I18nProvider>
    ))

    preload!('de')
    expect(chunkLoader).toHaveBeenCalledWith('de')

    // Wait for the async chunkLoader to resolve
    await vi.waitFor(() => {
      expect(checkTe!('hello', 'de')).toBe(true)
    })
  })

  it('preload failure logs console.warn and does not crash', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const chunkLoader = vi.fn().mockRejectedValue(new Error('network error'))
    let preload: (loc: string) => void

    function Child() {
      const { preloadLocale } = useI18n()
      preload = preloadLocale
      return <span>test</span>
    }

    render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        lazyLocaleLoading={true}
        chunkLoader={chunkLoader}
      >
        <Child />
      </I18nProvider>
    ))

    preload!('de')

    await vi.waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('preload failed'),
        'de',
        expect.any(Error),
      )
    })

    warnSpy.mockRestore()
  })

  it('preload then setLocale does not reload', async () => {
    let resolveFirst: (v: Record<string, string>) => void
    const firstPromise = new Promise<Record<string, string>>((r) => { resolveFirst = r })
    const chunkLoader = vi.fn().mockReturnValueOnce(firstPromise)
    let preload: (loc: string) => void
    let changeLocale: (l: string) => Promise<void>

    function Child() {
      const { preloadLocale, setLocale, t } = useI18n()
      preload = preloadLocale
      changeLocale = setLocale
      return <span data-testid="text">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        lazyLocaleLoading={true}
        chunkLoader={chunkLoader}
      >
        <Child />
      </I18nProvider>
    ))

    // Preload 'de'
    preload!('de')
    resolveFirst!({ hello: 'Hallo' })

    await vi.waitFor(() => {
      // chunkLoader called once for preload
      expect(chunkLoader).toHaveBeenCalledTimes(1)
    })

    // Now setLocale('de') — should NOT call chunkLoader again because messages are already loaded
    await changeLocale!('de')
    await Promise.resolve()

    expect(chunkLoader).toHaveBeenCalledTimes(1) // No additional call
    expect(getByTestId('text').textContent).toBe('Hallo')
  })
})

// ─── #13 Diagnostics duck-typing ──────────────────────────────────────────────

describe('Diagnostics duck-typing', () => {
  it('duck-typed diagnostics object calls missingKey on missing key', () => {
    const missingKeyFn = vi.fn()
    const fallbackUsedFn = vi.fn()
    const diagnostics = { missingKey: missingKeyFn, fallbackUsed: fallbackUsedFn, enabled: true }

    function Child() {
      const { t } = useI18n()
      return <span>{t('nonexistent_key')}</span>
    }

    render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        diagnostics={diagnostics}
      >
        <Child />
      </I18nProvider>
    ))

    expect(missingKeyFn).toHaveBeenCalled()
  })

  it('duck-typed diagnostics calls fallbackUsed when fallback locale used', () => {
    const missingKeyFn = vi.fn()
    const fallbackUsedFn = vi.fn()
    const diagnostics = { missingKey: missingKeyFn, fallbackUsed: fallbackUsedFn, enabled: true }

    function Child() {
      const { t } = useI18n()
      return <span>{t('onlyEn')}</span>
    }

    render(() => (
      <I18nProvider
        locale="fr"
        fallbackLocale="en"
        messages={{ en: { onlyEn: 'English only' }, fr: {} }}
        diagnostics={diagnostics}
      >
        <Child />
      </I18nProvider>
    ))

    expect(fallbackUsedFn).toHaveBeenCalled()
  })

  it('old config shape without missingKey does not crash', () => {
    const diagnostics = { enabled: true } as any

    function Child() {
      const { t } = useI18n()
      return <span>{t('nonexistent')}</span>
    }

    expect(() =>
      render(() => (
        <I18nProvider locale="en" messages={{ en: {} }} diagnostics={diagnostics}>
          <Child />
        </I18nProvider>
      )),
    ).not.toThrow()
  })

  it('no diagnostics does not error', () => {
    function Child() {
      const { t } = useI18n()
      return <span>{t('missing')}</span>
    }

    expect(() =>
      render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Child />
        </I18nProvider>
      )),
    ).not.toThrow()
  })
})

// ─── #14 Split runtime integration ───────────────────────────────────────────

describe('Split runtime integration', () => {
  const SPLIT_RUNTIME_KEY = Symbol.for('fluenti.runtime.solid.v1')

  afterEach(() => {
    // Clean up globalThis after each test
    delete (globalThis as any)[SPLIT_RUNTIME_KEY]
  })

  it('setLocale with lazy loading calls __switchLocale', async () => {
    const switchLocaleSpy = vi.fn().mockResolvedValue(undefined)
    ;(globalThis as any)[SPLIT_RUNTIME_KEY] = { __switchLocale: switchLocaleSpy }

    let changeLocale: (l: string) => Promise<void>

    function Child() {
      const { setLocale, t } = useI18n()
      changeLocale = setLocale
      return <span>{t('hello')}</span>
    }

    render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        lazyLocaleLoading={true}
        chunkLoader={() => Promise.resolve({ hello: 'Hallo' })}
      >
        <Child />
      </I18nProvider>
    ))

    await changeLocale!('de')
    await Promise.resolve()

    expect(switchLocaleSpy).toHaveBeenCalledWith('de')
  })

  it('__switchLocale rejection does not crash', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const switchLocaleSpy = vi.fn().mockRejectedValue(new Error('split runtime error'))
    ;(globalThis as any)[SPLIT_RUNTIME_KEY] = { __switchLocale: switchLocaleSpy }

    let changeLocale: (l: string) => Promise<void>

    function Child() {
      const { setLocale, t } = useI18n()
      changeLocale = setLocale
      return <span>{t('hello')}</span>
    }

    render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        lazyLocaleLoading={true}
        chunkLoader={() => Promise.resolve({ hello: 'Hallo' })}
      >
        <Child />
      </I18nProvider>
    ))

    // Should not throw even if __switchLocale rejects — error is caught and warned
    await changeLocale!('de')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('split runtime switch failed'),
      expect.any(Error),
    )
    warnSpy.mockRestore()
  })

  it('preloadLocale calls __preloadLocale on split runtime', async () => {
    const preloadLocaleSpy = vi.fn().mockResolvedValue(undefined)
    ;(globalThis as any)[SPLIT_RUNTIME_KEY] = { __preloadLocale: preloadLocaleSpy }

    let preload: (loc: string) => void

    function Child() {
      const { preloadLocale } = useI18n()
      preload = preloadLocale
      return <span>test</span>
    }

    render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        lazyLocaleLoading={true}
        chunkLoader={() => Promise.resolve({ hello: 'Hallo' })}
      >
        <Child />
      </I18nProvider>
    ))

    preload!('de')

    await vi.waitFor(() => {
      expect(preloadLocaleSpy).toHaveBeenCalledWith('de')
    })
  })
})

// ─── #15 setLocale + core sync ───────────────────────────────────────────────

describe('setLocale + core sync', () => {
  it('loadMessages then setLocale does not trigger duplicate load', async () => {
    const chunkLoader = vi.fn().mockResolvedValue({ hello: 'Hallo' })
    let changeLocale: (l: string) => Promise<void>
    let addMessages: (loc: string, msgs: Record<string, string>) => void

    function Child() {
      const { t, setLocale, loadMessages } = useI18n()
      changeLocale = setLocale
      addMessages = loadMessages
      return <span data-testid="text">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        lazyLocaleLoading={true}
        chunkLoader={chunkLoader}
      >
        <Child />
      </I18nProvider>
    ))

    // Pre-load messages via loadMessages (synchronous)
    addMessages!('de', { hello: 'Hallo' })

    // setLocale should see that 'de' is already loaded and skip chunkLoader
    await changeLocale!('de')
    await Promise.resolve()

    expect(chunkLoader).not.toHaveBeenCalled()
    expect(getByTestId('text').textContent).toBe('Hallo')
  })

  it('setLocale during transition — t() does not crash', async () => {
    let changeLocale: (l: string) => Promise<void>
    let translate: (key: string) => string

    function Child() {
      const { t, setLocale } = useI18n()
      changeLocale = setLocale
      translate = t
      return <span data-testid="text">{t('hello')}</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>
    ))

    // Fire setLocale and immediately call t() — should not throw
    changeLocale!('fr')
    expect(() => translate!('hello')).not.toThrow()

    await Promise.resolve()

    // After settling, should show the new locale
    expect(translate!('hello')).toBe('Bonjour')
  })
})
