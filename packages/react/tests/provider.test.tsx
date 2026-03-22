import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, act, waitFor, cleanup } from '@testing-library/react'
import { I18nProvider, useI18n } from '../src'
import { getGlobalI18n, clearGlobalI18n } from '../src/global-registry'

const messages = {
  en: { hello: 'Hello', greeting: 'Hello {name}!' },
  fr: { hello: 'Bonjour', greeting: 'Bonjour {name}!' },
}

function Child() {
  const { i18n } = useI18n()
  return <span>{i18n.t('hello')}</span>
}

describe('I18nProvider', () => {
  afterEach(cleanup)

  it('renders children with locale context', () => {
    render(
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>,
    )
    expect(screen.getByText('Hello')).toBeDefined()
  })

  it('static messages available immediately', () => {
    function Greeting() {
      const { i18n } = useI18n()
      return <span>{i18n.t('greeting', { name: 'World' })}</span>
    }

    render(
      <I18nProvider locale="en" messages={messages}>
        <Greeting />
      </I18nProvider>,
    )
    expect(screen.getByText('Hello World!')).toBeDefined()
  })

  it('fallback locale used when translation missing', () => {
    const msgs = {
      en: { hello: 'Hello', onlyEn: 'English only' },
      fr: { hello: 'Bonjour' },
    }

    function OnlyEn() {
      const { i18n } = useI18n()
      return <span>{i18n.t('onlyEn')}</span>
    }

    render(
      <I18nProvider locale="fr" fallbackLocale="en" messages={msgs}>
        <OnlyEn />
      </I18nProvider>,
    )
    expect(screen.getByText('English only')).toBeDefined()
  })

  it('returns the id when nothing else works', () => {
    function Missing() {
      const { i18n } = useI18n()
      return <span>{i18n.t('nonexistent.key')}</span>
    }

    render(
      <I18nProvider locale="en" messages={messages}>
        <Missing />
      </I18nProvider>,
    )
    expect(screen.getByText('nonexistent.key')).toBeDefined()
  })

  it('lazy loading triggers loadMessages function', async () => {
    const loadMessages = vi.fn(async (locale: string) => {
      if (locale === 'fr') return { hello: 'Bonjour' }
      return {}
    })

    function Switcher() {
      const { setLocale, i18n, isLoading } = useI18n()
      return (
        <div>
          <span data-testid="text">{i18n.t('hello')}</span>
          <span data-testid="loading">{String(isLoading)}</span>
          <button onClick={() => setLocale('fr')}>Switch</button>
        </div>
      )
    }

    render(
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        loadMessages={loadMessages}
      >
        <Switcher />
      </I18nProvider>,
    )

    expect(screen.getByTestId('text').textContent).toBe('Hello')

    await act(async () => {
      screen.getByText('Switch').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('text').textContent).toBe('Bonjour')
    })
    expect(loadMessages).toHaveBeenCalledWith('fr')
  })

  it('isLoading is true during async load', async () => {
    let resolveLoad: (value: Record<string, string>) => void
    const loadMessages = vi.fn(
      () => new Promise<Record<string, string>>((resolve) => { resolveLoad = resolve }),
    )

    const loadingStates: boolean[] = []

    function Tracker() {
      const { setLocale, isLoading } = useI18n()
      loadingStates.push(isLoading)
      return <button onClick={() => setLocale('fr')}>Switch</button>
    }

    render(
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        loadMessages={loadMessages}
      >
        <Tracker />
      </I18nProvider>,
    )

    expect(loadingStates[0]).toBe(false)

    await act(async () => {
      screen.getByText('Switch').click()
    })

    // Loading should be true now
    expect(loadingStates).toContain(true)

    await act(async () => {
      resolveLoad!({ hello: 'Bonjour' })
    })

    // Should go back to false
    await waitFor(() => {
      expect(loadingStates[loadingStates.length - 1]).toBe(false)
    })
  })

  it('external locale prop change triggers switch', async () => {
    function Display() {
      const { i18n } = useI18n()
      return <span data-testid="text">{i18n.t('hello')}</span>
    }

    function App() {
      const [locale, setLocale] = useState('en')
      return (
        <I18nProvider locale={locale} messages={messages}>
          <Display />
          <button onClick={() => setLocale('fr')}>Switch</button>
        </I18nProvider>
      )
    }

    render(<App />)
    expect(screen.getByTestId('text').textContent).toBe('Hello')

    await act(async () => {
      screen.getByText('Switch').click()
    })

    expect(screen.getByTestId('text').textContent).toBe('Bonjour')
  })

  it('unwraps ES module default exports in static messages prop', () => {
    const esModuleMessages = {
      en: { default: { hello: 'Hello' } },
      fr: { default: { hello: 'Bonjour' } },
    }

    render(
      <I18nProvider locale="en" messages={esModuleMessages as never}>
        <Child />
      </I18nProvider>,
    )
    expect(screen.getByText('Hello')).toBeDefined()
  })

  it('handles mixed plain and ES module messages', () => {
    const mixedMessages = {
      en: { hello: 'Hello' },
      fr: { default: { hello: 'Bonjour' } },
    }

    render(
      <I18nProvider locale="en" messages={mixedMessages as never}>
        <Child />
      </I18nProvider>,
    )
    expect(screen.getByText('Hello')).toBeDefined()
  })

  it('sets global i18n instance on mount', () => {
    clearGlobalI18n()
    expect(getGlobalI18n()).toBeUndefined()

    render(
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>,
    )

    expect(getGlobalI18n()).toBeDefined()
    expect(getGlobalI18n()!.t('hello')).toBe('Hello')
  })

  it('no loadMessages but locale not loaded → console.warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    function Switcher() {
      const { setLocale } = useI18n()
      return <button onClick={() => setLocale('de')}>Switch</button>
    }

    render(
      <I18nProvider locale="en" messages={{ en: { hello: 'Hello' } }}>
        <Switcher />
      </I18nProvider>,
    )

    await act(async () => {
      screen.getByText('Switch').click()
    })

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No messages for locale "de"'),
    )

    warnSpy.mockRestore()
  })

  it('stale request error is silently ignored', async () => {
    let callCount = 0
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    let rejectFirst: (err: Error) => void
    const firstPromise = new Promise<Record<string, string>>((_resolve, reject) => {
      rejectFirst = reject
    })

    const loadMessages = vi.fn((locale: string) => {
      callCount++
      if (callCount === 1) return firstPromise // slow, will be rejected
      if (locale === 'de') return Promise.resolve({ hello: 'Hallo' })
      return Promise.resolve({})
    })

    function Switcher() {
      const { setLocale, i18n } = useI18n()
      return (
        <div>
          <span data-testid="text">{i18n.t('hello')}</span>
          <button data-testid="fr" onClick={() => setLocale('fr')}>FR</button>
          <button data-testid="de" onClick={() => setLocale('de')}>DE</button>
        </div>
      )
    }

    render(
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        loadMessages={loadMessages}
      >
        <Switcher />
      </I18nProvider>,
    )

    // Start slow fr load
    await act(async () => {
      screen.getByTestId('fr').click()
    })

    // Start fast de load — supersedes fr
    await act(async () => {
      screen.getByTestId('de').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('text').textContent).toBe('Hallo')
    })

    // Now reject the stale first request — should not log error
    await act(async () => {
      rejectFirst!(new Error('stale network error'))
    })

    // The stale error should NOT be logged (requestId mismatch)
    expect(errorSpy).not.toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it('preloadLocale error does not break subsequent setLocale', async () => {
    let loadCallCount = 0
    const loadMessages = vi.fn(async (locale: string) => {
      loadCallCount++
      if (locale === 'fr' && loadCallCount === 1) throw new Error('preload fail')
      if (locale === 'de') return { hello: 'Hallo' }
      return { hello: 'Bonjour' }
    })

    function Switcher() {
      const { setLocale, i18n, preloadLocale } = useI18n()
      return (
        <div>
          <span data-testid="text">{i18n.t('hello')}</span>
          <button data-testid="preload" onClick={() => preloadLocale('fr')}>Preload</button>
          <button data-testid="switch" onClick={() => setLocale('de')}>DE</button>
        </div>
      )
    }

    render(
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        loadMessages={loadMessages}
      >
        <Switcher />
      </I18nProvider>,
    )

    // Preload fr (will fail silently)
    await act(async () => {
      screen.getByTestId('preload').click()
    })

    await new Promise((r) => setTimeout(r, 10))

    // Now switch to de — should work fine
    await act(async () => {
      screen.getByTestId('switch').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('text').textContent).toBe('Hallo')
    })
  })

  it('early return when already loaded + no loadMessages', async () => {
    function Switcher() {
      const { setLocale, i18n } = useI18n()
      return (
        <div>
          <span data-testid="text">{i18n.t('hello')}</span>
          <button onClick={() => setLocale('fr')}>Switch</button>
        </div>
      )
    }

    render(
      <I18nProvider locale="en" messages={messages}>
        <Switcher />
      </I18nProvider>,
    )

    // fr is already in static messages, no loadMessages provided
    await act(async () => {
      screen.getByText('Switch').click()
    })

    expect(screen.getByTestId('text').textContent).toBe('Bonjour')
  })

  it('getGlobalI18n undefined before mount', () => {
    clearGlobalI18n()
    expect(getGlobalI18n()).toBeUndefined()
  })

  it('updates global i18n instance on locale change', async () => {
    clearGlobalI18n()

    function Switcher() {
      const { setLocale, i18n } = useI18n()
      return (
        <div>
          <span data-testid="text">{i18n.t('hello')}</span>
          <button onClick={() => setLocale('fr')}>Switch</button>
        </div>
      )
    }

    render(
      <I18nProvider locale="en" messages={messages}>
        <Switcher />
      </I18nProvider>,
    )

    expect(getGlobalI18n()!.t('hello')).toBe('Hello')

    await act(async () => {
      screen.getByText('Switch').click()
    })

    expect(getGlobalI18n()!.t('hello')).toBe('Bonjour')
  })

  it('setLocale for already-loaded locale switches instantly', async () => {
    function Switcher() {
      const { setLocale, i18n } = useI18n()
      return (
        <div>
          <span data-testid="text">{i18n.t('hello')}</span>
          <button onClick={() => setLocale('fr')}>Switch</button>
        </div>
      )
    }

    render(
      <I18nProvider locale="en" messages={messages}>
        <Switcher />
      </I18nProvider>,
    )

    expect(screen.getByTestId('text').textContent).toBe('Hello')

    await act(async () => {
      screen.getByText('Switch').click()
    })

    expect(screen.getByTestId('text').textContent).toBe('Bonjour')
  })
})

describe('locale switch race conditions', () => {
  afterEach(cleanup)

  it('rapid sequential setLocale calls — only final locale wins', async () => {
    const loadMessages = vi.fn(async (locale: string) => {
      const catalog: Record<string, Record<string, string>> = {
        ja: { hello: 'こんにちは' },
        fr: { hello: 'Bonjour' },
        de: { hello: 'Hallo' },
      }
      return catalog[locale] ?? {}
    })

    function Switcher() {
      const { setLocale, i18n, locale } = useI18n()
      return (
        <div>
          <span data-testid="text">{i18n.t('hello')}</span>
          <span data-testid="locale">{locale}</span>
          <button data-testid="rapid" onClick={() => {
            setLocale('ja')
            setLocale('fr')
            setLocale('de')
          }}>Rapid</button>
        </div>
      )
    }

    render(
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        loadMessages={loadMessages}
      >
        <Switcher />
      </I18nProvider>,
    )

    await act(async () => {
      screen.getByTestId('rapid').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('de')
    })
    expect(screen.getByTestId('text').textContent).toBe('Hallo')
  })

  it('out-of-order async responses — latest request wins over stale', async () => {
    let jaResolve: (msgs: Record<string, string>) => void
    let frResolve: (msgs: Record<string, string>) => void

    const loadMessages = vi.fn((locale: string) => {
      if (locale === 'ja') {
        return new Promise<Record<string, string>>((resolve) => { jaResolve = resolve })
      }
      if (locale === 'fr') {
        return new Promise<Record<string, string>>((resolve) => { frResolve = resolve })
      }
      return Promise.resolve({})
    })

    function Switcher() {
      const { setLocale, i18n, locale } = useI18n()
      return (
        <div>
          <span data-testid="text">{i18n.t('hello')}</span>
          <span data-testid="locale">{locale}</span>
          <button data-testid="ja" onClick={() => setLocale('ja')}>JA</button>
          <button data-testid="fr" onClick={() => setLocale('fr')}>FR</button>
        </div>
      )
    }

    render(
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        loadMessages={loadMessages}
      >
        <Switcher />
      </I18nProvider>,
    )

    // Start slow 'ja' load
    await act(async () => {
      screen.getByTestId('ja').click()
    })

    // Start 'fr' load (supersedes 'ja')
    await act(async () => {
      screen.getByTestId('fr').click()
    })

    // Resolve 'fr' first (50ms equivalent — it's the latest request)
    await act(async () => {
      frResolve!({ hello: 'Bonjour' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('fr')
    })
    expect(screen.getByTestId('text').textContent).toBe('Bonjour')

    // Now resolve stale 'ja' — should be discarded
    await act(async () => {
      jaResolve!({ hello: 'こんにちは' })
    })

    // Still 'fr', not 'ja'
    expect(screen.getByTestId('locale').textContent).toBe('fr')
    expect(screen.getByTestId('text').textContent).toBe('Bonjour')
  })
})

describe('split runtime edge cases', () => {
  const SPLIT_RUNTIME_KEY = Symbol.for('fluenti.runtime.react.v1')

  afterEach(() => {
    cleanup()
    delete (globalThis as Record<PropertyKey, unknown>)[SPLIT_RUNTIME_KEY]
  })

  it('rejected __switchLocale promise does not crash the app', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    ;(globalThis as Record<PropertyKey, unknown>)[SPLIT_RUNTIME_KEY] = {
      __switchLocale: vi.fn().mockRejectedValue(new Error('split runtime failure')),
    }

    const loadMessages = vi.fn(async (locale: string) => {
      if (locale === 'fr') return { hello: 'Bonjour' }
      return {}
    })

    function Switcher() {
      const { setLocale, i18n } = useI18n()
      return (
        <div>
          <span data-testid="text">{i18n.t('hello')}</span>
          <button onClick={() => setLocale('fr')}>Switch</button>
        </div>
      )
    }

    render(
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        loadMessages={loadMessages}
      >
        <Switcher />
      </I18nProvider>,
    )

    await act(async () => {
      screen.getByText('Switch').click()
    })

    // The error should be caught and logged, not crash the app
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled()
    })

    errorSpy.mockRestore()
  })
})
