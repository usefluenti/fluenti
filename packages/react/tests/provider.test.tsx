import { describe, it, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, act, waitFor, cleanup } from '@testing-library/react'
import { I18nProvider, useI18n } from '../src'

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
