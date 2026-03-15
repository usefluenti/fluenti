import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, waitFor, cleanup } from '@testing-library/react'
import { I18nProvider, useI18n } from '../src'

describe('Locale Switching', () => {
  afterEach(cleanup)
  it('instant switch for preloaded locale', async () => {
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
        messages={{ en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } }}
      >
        <Switcher />
      </I18nProvider>,
    )

    expect(screen.getByTestId('text').textContent).toBe('Hello')

    await act(async () => {
      screen.getByText('Switch').click()
    })

    expect(screen.getByTestId('text').textContent).toBe('Bonjour')
  })

  it('async load for new locale', async () => {
    const loadMessages = vi.fn(async () => ({ hello: 'Bonjour' }))

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
  })

  it('preloadLocale loads without switching', async () => {
    const loadMessages = vi.fn(async () => ({ hello: 'Bonjour' }))

    function Preloader() {
      const { preloadLocale, i18n, locale } = useI18n()
      return (
        <div>
          <span data-testid="locale">{locale}</span>
          <span data-testid="text">{i18n.t('hello')}</span>
          <button onClick={() => preloadLocale('fr')}>Preload</button>
        </div>
      )
    }

    render(
      <I18nProvider
        locale="en"
        messages={{ en: { hello: 'Hello' } }}
        loadMessages={loadMessages}
      >
        <Preloader />
      </I18nProvider>,
    )

    await act(async () => {
      screen.getByText('Preload').click()
    })

    await waitFor(() => {
      expect(loadMessages).toHaveBeenCalledWith('fr')
    })

    // Locale should NOT have changed
    expect(screen.getByTestId('locale').textContent).toBe('en')
    expect(screen.getByTestId('text').textContent).toBe('Hello')
  })
})
