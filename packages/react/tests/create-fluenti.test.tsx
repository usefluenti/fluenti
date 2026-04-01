import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { I18nProvider, useI18n, createFluenti } from '../src'
import { interpolate } from '../../core/src/runtime'

const messages = {
  en: { hello: 'Hello', greeting: 'Hello {name}!' },
  fr: { hello: 'Bonjour', greeting: 'Bonjour {name}!' },
}

function Child() {
  const { t, locale } = useI18n()
  return <span data-testid="msg">{t('hello')} ({locale})</span>
}

describe('createFluenti', () => {
  afterEach(cleanup)

  it('returns object with t, d, n, locale, setLocale', () => {
    function Wrapper() {
      const instance = createFluenti({ locale: 'en', messages })
      return (
        <div>
          <span data-testid="has-t">{String(typeof instance.t)}</span>
          <span data-testid="has-d">{String(typeof instance.d)}</span>
          <span data-testid="has-n">{String(typeof instance.n)}</span>
          <span data-testid="has-setLocale">{String(typeof instance.setLocale)}</span>
          <span data-testid="locale">{instance.locale}</span>
          <span data-testid="has-te">{String(typeof instance.te)}</span>
          <span data-testid="has-tm">{String(typeof instance.tm)}</span>
          <span data-testid="has-preload">{String(typeof instance.preloadLocale)}</span>
          <span data-testid="isLoading">{String(instance.isLoading)}</span>
        </div>
      )
    }

    render(<Wrapper />)
    expect(screen.getByTestId('has-t').textContent).toBe('function')
    expect(screen.getByTestId('has-d').textContent).toBe('function')
    expect(screen.getByTestId('has-n').textContent).toBe('function')
    expect(screen.getByTestId('has-setLocale').textContent).toBe('function')
    expect(screen.getByTestId('locale').textContent).toBe('en')
    expect(screen.getByTestId('has-te').textContent).toBe('function')
    expect(screen.getByTestId('has-tm').textContent).toBe('function')
    expect(screen.getByTestId('has-preload').textContent).toBe('function')
    expect(screen.getByTestId('isLoading').textContent).toBe('false')
  })

  it('I18nProvider with instance prop works', () => {
    function App() {
      const instance = createFluenti({ locale: 'en', messages })
      return (
        <I18nProvider instance={instance}>
          <Child />
        </I18nProvider>
      )
    }

    render(<App />)
    expect(screen.getByTestId('msg').textContent).toBe('Hello (en)')
  })

  it('I18nProvider with inline props still works (backward compat)', () => {
    render(
      <I18nProvider locale="fr" messages={messages}>
        <Child />
      </I18nProvider>,
    )
    expect(screen.getByTestId('msg').textContent).toBe('Bonjour (fr)')
  })

  it('te returns true for existing keys and false for missing', () => {
    function Wrapper() {
      const instance = createFluenti({ locale: 'en', messages })
      return (
        <div>
          <span data-testid="exists">{String(instance.te('hello'))}</span>
          <span data-testid="missing">{String(instance.te('nonexistent'))}</span>
        </div>
      )
    }

    render(<Wrapper />)
    expect(screen.getByTestId('exists').textContent).toBe('true')
    expect(screen.getByTestId('missing').textContent).toBe('false')
  })

  it('tm returns raw message string', () => {
    function Wrapper() {
      const instance = createFluenti({ locale: 'en', messages })
      return (
        <div>
          <span data-testid="raw">{instance.tm('hello') ?? 'undefined'}</span>
          <span data-testid="raw-missing">{instance.tm('nonexistent') ?? 'undefined'}</span>
        </div>
      )
    }

    render(<Wrapper />)
    expect(screen.getByTestId('raw').textContent).toBe('Hello')
    expect(screen.getByTestId('raw-missing').textContent).toBe('undefined')
  })
})

describe('new config options', () => {
  afterEach(cleanup)

  it('createFluenti with interpolate option enables ICU messages', () => {
    const icuMessages = {
      en: { apples: '{count, plural, one {# apple} other {# apples}}' },
    }

    function Wrapper() {
      const instance = createFluenti({ locale: 'en', messages: icuMessages, interpolate })
      return <span data-testid="text">{instance.t('apples', { count: 5 })}</span>
    }

    render(<Wrapper />)
    expect(screen.getByTestId('text').textContent).toBe('5 apples')
  })

  it('createFluenti with diagnostics option', () => {
    const diag = {
      missingKey: vi.fn(),
      fallbackUsed: vi.fn(),
      parseError: vi.fn(),
      formatError: vi.fn(),
      enabled: true,
    }

    function Wrapper() {
      const instance = createFluenti({ locale: 'en', messages: { en: {} }, diagnostics: diag })
      return <span data-testid="text">{instance.t('missing_key')}</span>
    }

    render(<Wrapper />)
    expect(diag.missingKey).toHaveBeenCalledWith('en', 'missing_key')
  })

  it('createFluenti with minimal config (no messages, no loadMessages)', () => {
    function Wrapper() {
      const instance = createFluenti({ locale: 'en' })
      return (
        <div>
          <span data-testid="locale">{instance.locale}</span>
          <span data-testid="text">{instance.t('hello')}</span>
        </div>
      )
    }

    render(<Wrapper />)
    expect(screen.getByTestId('locale').textContent).toBe('en')
    // With no messages, key should be returned as fallback
    expect(screen.getByTestId('text').textContent).toBe('hello')
  })
})
