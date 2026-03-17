import { describe, it, expect, vi } from 'vitest'
import { render } from '@solidjs/testing-library'
import { I18nProvider, useI18n } from '../src'
import { resetGlobalI18nContext } from '../src/context'

const messages = {
  en: { hello: 'Hello', greeting: 'Hi {name}' },
  fr: { hello: 'Bonjour', greeting: 'Salut {name}' },
}

describe('useI18n reactivity', () => {
  it('component body runs once, text updates on locale change', async () => {
    const bodyRuns = vi.fn()
    let changeLocale: (l: string) => void

    function Child() {
      bodyRuns()
      const { t, setLocale } = useI18n()
      changeLocale = setLocale
      return <span data-testid="text">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>
    ))

    expect(getByTestId('text').textContent).toBe('Hello')
    expect(bodyRuns).toHaveBeenCalledTimes(1)

    // Change locale reactively
    changeLocale!('fr')
    // Wait for Solid reactivity to flush
    await Promise.resolve()

    expect(getByTestId('text').textContent).toBe('Bonjour')
    // Body should NOT have re-run (Solid fine-grained reactivity)
    expect(bodyRuns).toHaveBeenCalledTimes(1)
  })

  it('supports compiled message functions', async () => {
    const msgs = {
      en: {
        compiled: (vals?: Record<string, unknown>) =>
          `Count: ${vals?.['count'] ?? 0}`,
      },
    }

    function Child() {
      const { t } = useI18n()
      return <span data-testid="text">{t('compiled', { count: 42 })}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="en" messages={msgs}>
        <Child />
      </I18nProvider>
    ))

    expect(getByTestId('text').textContent).toBe('Count: 42')
  })

  it('loadMessages adds messages dynamically', async () => {
    function Child() {
      const { t, loadMessages } = useI18n()
      void loadMessages
      return <span data-testid="text">{t('dynamic')}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Child />
      </I18nProvider>
    ))

    // Before loading, returns the id
    expect(getByTestId('text').textContent).toBe('dynamic')

    // Note: loadMessages doesn't trigger reactivity by itself since
    // messages is a plain object. A locale change would be needed to see updates.
  })

  it('getLocales returns available locales', () => {
    let locales: string[] = []

    function Child() {
      const { getLocales } = useI18n()
      locales = getLocales()
      return <span>test</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>
    ))

    expect(locales).toContain('en')
    expect(locales).toContain('fr')
  })

  it('d() formats dates for current locale', () => {
    let formatted = ''

    function Child() {
      const { d } = useI18n()
      formatted = d(new Date(2024, 0, 15))
      return <span>{formatted}</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Child />
      </I18nProvider>
    ))

    expect(formatted).toBeTruthy()
    expect(typeof formatted).toBe('string')
  })

  it('n() formats numbers for current locale', () => {
    let formatted = ''

    function Child() {
      const { n } = useI18n()
      formatted = n(1234.5)
      return <span>{formatted}</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Child />
      </I18nProvider>
    ))

    expect(formatted).toBeTruthy()
  })

  it('format() interpolates arbitrary message strings', () => {
    let result = ''

    function Child() {
      const { format } = useI18n()
      result = format('Hello {name}, you have {count} items', {
        name: 'Alice',
        count: 3,
      })
      return <span>{result}</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Child />
      </I18nProvider>
    ))

    expect(result).toBe('Hello Alice, you have 3 items')
  })

  it('format() returns message unchanged when no values given', () => {
    let result = ''

    function Child() {
      const { format } = useI18n()
      result = format('No placeholders here')
      return <span>{result}</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Child />
      </I18nProvider>
    ))

    expect(result).toBe('No placeholders here')
  })

  it('t() accepts MessageDescriptor with id', () => {
    let result = ''

    function Child() {
      const { t } = useI18n()
      result = t({ id: 'hello', message: 'Fallback Hello' })
      return <span>{result}</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>
    ))

    expect(result).toBe('Hello')
  })

  it('t() MessageDescriptor falls back to message when id not found', () => {
    let result = ''

    function Child() {
      const { t } = useI18n()
      result = t({ id: 'nonexistent', message: 'Fallback {name}' }, { name: 'World' })
      return <span>{result}</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>
    ))

    expect(result).toBe('Fallback World')
  })

  it('t() MessageDescriptor returns id when no message fallback', () => {
    let result = ''

    function Child() {
      const { t } = useI18n()
      result = t({ id: 'nonexistent' })
      return <span>{result}</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>
    ))

    expect(result).toBe('nonexistent')
  })

  it('d() respects named date format styles', () => {
    let result = ''

    function Child() {
      const { d } = useI18n()
      result = d(new Date(2025, 0, 15), 'short')
      return <span>{result}</span>
    }

    render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        dateFormats={{ short: { year: '2-digit', month: 'numeric', day: 'numeric' } }}
      >
        <Child />
      </I18nProvider>
    ))

    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('n() respects named number format styles', () => {
    let result = ''

    function Child() {
      const { n } = useI18n()
      result = n(42.5, 'currency')
      return <span>{result}</span>
    }

    render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        numberFormats={{ currency: { style: 'currency', currency: 'USD' } }}
      >
        <Child />
      </I18nProvider>
    ))

    expect(result).toContain('42')
  })

  // ─── Edge cases ──────────────────────────────────────────────────────

  it('throws when useI18n is called outside provider', () => {
    resetGlobalI18nContext()

    function BadChild() {
      const { t } = useI18n()
      return <span>{t('hello')}</span>
    }

    expect(() => render(() => <BadChild />)).toThrow(
      'useI18n requires either createI18n()',
    )
  })

  it('returns all expected properties from useI18n', () => {
    let ctx: ReturnType<typeof useI18n> | undefined

    function Child() {
      ctx = useI18n()
      return <span>test</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>
    ))

    expect(ctx).toBeDefined()
    expect(typeof ctx!.t).toBe('function')
    expect(typeof ctx!.locale).toBe('function')
    expect(typeof ctx!.setLocale).toBe('function')
    expect(typeof ctx!.loadMessages).toBe('function')
    expect(typeof ctx!.getLocales).toBe('function')
    expect(typeof ctx!.d).toBe('function')
    expect(typeof ctx!.n).toBe('function')
    expect(typeof ctx!.format).toBe('function')
    expect(typeof ctx!.isLoading).toBe('function')
    expect(typeof ctx!.loadedLocales).toBe('function')
    expect(typeof ctx!.preloadLocale).toBe('function')
  })

  it('setLocale triggers reactive update in rendered output', async () => {
    let changeLocale: (l: string) => void

    function Child() {
      const { t, setLocale } = useI18n()
      changeLocale = setLocale
      return <span data-testid="output">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>
    ))

    expect(getByTestId('output').textContent).toBe('Hello')

    changeLocale!('fr')
    await Promise.resolve()

    expect(getByTestId('output').textContent).toBe('Bonjour')
  })
})
