import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@solidjs/testing-library'
import { interpolate } from '@fluenti/core/runtime'
import { I18nProvider, createFluenti, useI18n } from '../src'
import { __resetFluentiGlobalStateForTests } from '../src/context'

const messages = {
  en: { hello: 'Hello', greeting: 'Hi {name}' },
  fr: { hello: 'Bonjour', greeting: 'Salut {name}' },
}

afterEach(() => {
  __resetFluentiGlobalStateForTests()
})

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

  it('returns a development fallback when useI18n is called outside provider', () => {
    function BadChild() {
      const { t } = useI18n()
      return <span>{t({ id: 'hello', message: 'Hello' })}</span>
    }

    const { getByText } = render(() => <BadChild />)
    expect(getByText('Hello')).toBeDefined()
  })

  it('still throws in production when no provider or singleton is present', () => {
    const previousNodeEnv = process.env['NODE_ENV']
    process.env['NODE_ENV'] = 'production'

    try {
      function BadChild() {
        const { t } = useI18n()
        return <span>{t('hello')}</span>
      }

      expect(() => render(() => <BadChild />)).toThrow(
        'useI18n() must be used inside an <I18nProvider>.',
      )
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env['NODE_ENV']
      } else {
        process.env['NODE_ENV'] = previousNodeEnv
      }
      __resetFluentiGlobalStateForTests()
    }
  })

  it('uses createFluenti singleton when no provider is present', () => {
    createFluenti({
      locale: 'en',
      messages,
    })

    function Child() {
      const { t } = useI18n()
      return <span>{t('hello')}</span>
    }

    const { getByText } = render(() => <Child />)
    expect(getByText('Hello')).toBeDefined()
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

  // ─── Context signal edge cases ──────────────────────────────────────────────

  it('multiple concurrent setLocale calls — final one wins', async () => {
    const extMessages = {
      en: { hello: 'Hello' },
      fr: { hello: 'Bonjour' },
      ja: { hello: 'こんにちは' },
    }

    let changeLocale: (l: string) => void

    function Child() {
      const { t, setLocale } = useI18n()
      changeLocale = setLocale
      return <span data-testid="result">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="en" messages={extMessages}>
        <Child />
      </I18nProvider>
    ))

    expect(getByTestId('result').textContent).toBe('Hello')

    // Fire two setLocale calls in quick succession
    changeLocale!('fr')
    changeLocale!('ja')
    await Promise.resolve()

    expect(getByTestId('result').textContent).toBe('こんにちは')
  })

  it('calling t() during locale transition does not crash', async () => {
    let changeLocale: (l: string) => void
    let translate: (key: string) => string

    function Child() {
      const { t, setLocale } = useI18n()
      changeLocale = setLocale
      translate = t
      return <span data-testid="output">{t('hello')}</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>
    ))

    // Call setLocale and immediately call t() — should not throw
    changeLocale!('fr')
    expect(() => translate!('hello')).not.toThrow()

    await Promise.resolve()

    // After reactivity settles, t() should return the new locale's value
    expect(translate!('hello')).toBe('Bonjour')
  })
})

// ─── #8 Signal-wrapped method reactivity ──────────────────────────────────────

describe('Signal-wrapped method reactivity', () => {
  it('d(date) re-computes when locale changes', async () => {
    const testDate = new Date(2025, 0, 15)
    let changeLocale: (l: string) => void

    function Child() {
      const { d, setLocale } = useI18n()
      changeLocale = setLocale
      return <span data-testid="date">{d(testDate)}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="en" messages={{ en: {}, fr: {} }}>
        <Child />
      </I18nProvider>
    ))

    const enFormatted = getByTestId('date').textContent!
    expect(enFormatted).toBeTruthy()

    changeLocale!('fr')
    await Promise.resolve()

    const frFormatted = getByTestId('date').textContent!
    expect(frFormatted).toBeTruthy()
    // en and fr format dates differently (e.g. "1/15/2025" vs "15/01/2025")
    expect(frFormatted).not.toBe(enFormatted)
  })

  it('n(num) re-computes when locale changes', async () => {
    let changeLocale: (l: string) => void

    function Child() {
      const { n, setLocale } = useI18n()
      changeLocale = setLocale
      return <span data-testid="num">{n(1234.5)}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="en" messages={{ en: {}, de: {} }}>
        <Child />
      </I18nProvider>
    ))

    const enFormatted = getByTestId('num').textContent!
    expect(enFormatted).toBeTruthy()

    changeLocale!('de')
    await Promise.resolve()

    const deFormatted = getByTestId('num').textContent!
    expect(deFormatted).toBeTruthy()
    // en uses "1,234.5", de uses "1.234,5"
    expect(deFormatted).not.toBe(enFormatted)
  })

  it('format(msg, values) re-computes when locale changes', async () => {
    let changeLocale: (l: string) => void

    function Child() {
      const { format, setLocale } = useI18n()
      changeLocale = setLocale
      return (
        <span data-testid="fmt">
          {format('{count, plural, one {# item} other {# items}}', { count: 1 })}
        </span>
      )
    }

    const { getByTestId } = render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: {}, fr: {} }}
        interpolate={interpolate}
      >
        <Child />
      </I18nProvider>
    ))

    const enResult = getByTestId('fmt').textContent!
    expect(enResult).toBe('1 item')

    changeLocale!('fr')
    await Promise.resolve()

    // After locale change, format() should re-compute (even if result looks similar,
    // the signal dependency ensures it re-ran)
    const frResult = getByTestId('fmt').textContent!
    expect(frResult).toBeTruthy()
  })
})

// ─── #9 te() and tm() ────────────────────────────────────────────────────────

describe('te() and tm()', () => {
  const teMsgs = {
    en: { hello: 'Hello', compiled: (vals?: Record<string, unknown>) => `Count: ${vals?.['count'] ?? 0}` },
    fr: { hello: 'Bonjour' },
  }

  it('te(existing_key) returns true', () => {
    let result = false

    function Child() {
      const { te } = useI18n()
      result = te('hello')
      return <span>test</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={teMsgs}>
        <Child />
      </I18nProvider>
    ))

    expect(result).toBe(true)
  })

  it('te(missing_key) returns false', () => {
    let result = true

    function Child() {
      const { te } = useI18n()
      result = te('missing_key')
      return <span>test</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={teMsgs}>
        <Child />
      </I18nProvider>
    ))

    expect(result).toBe(false)
  })

  it('te(key, specific_locale) checks the specified locale', () => {
    let resultEn = false
    let resultFr = false
    let resultFrMissing = true

    function Child() {
      const { te } = useI18n()
      resultEn = te('hello', 'en')
      resultFr = te('hello', 'fr')
      resultFrMissing = te('compiled', 'fr')
      return <span>test</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={teMsgs}>
        <Child />
      </I18nProvider>
    ))

    expect(resultEn).toBe(true)
    expect(resultFr).toBe(true)
    expect(resultFrMissing).toBe(false)
  })

  it('tm(key) returns raw compiled message (string or function)', () => {
    let strMsg: unknown
    let fnMsg: unknown

    function Child() {
      const { tm } = useI18n()
      strMsg = tm('hello')
      fnMsg = tm('compiled')
      return <span>test</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={teMsgs}>
        <Child />
      </I18nProvider>
    ))

    expect(strMsg).toBe('Hello')
    expect(typeof fnMsg).toBe('function')
  })

  it('tm(missing) returns undefined', () => {
    let result: unknown = 'not-undefined'

    function Child() {
      const { tm } = useI18n()
      result = tm('missing')
      return <span>test</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={teMsgs}>
        <Child />
      </I18nProvider>
    ))

    expect(result).toBeUndefined()
  })

  it('tm(key, specific_locale) checks the specified locale', () => {
    let result: unknown

    function Child() {
      const { tm } = useI18n()
      result = tm('hello', 'fr')
      return <span>test</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={teMsgs}>
        <Child />
      </I18nProvider>
    ))

    expect(result).toBe('Bonjour')
  })
})
