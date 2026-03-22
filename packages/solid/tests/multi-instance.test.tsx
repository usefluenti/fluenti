import { describe, it, expect, afterEach, vi } from 'vitest'
import { createRoot } from 'solid-js'
import { createFluenti, resetGlobalFluentiContext, setGlobalFluentiContext } from '../src/context'
import { render } from '@solidjs/testing-library'
import { I18nProvider, useI18n } from '../src'

const enMessages = { en: { hello: 'Hello' } }
const jaMessages = { ja: { hello: 'こんにちは' } }

describe('createFluenti() factory', () => {
  afterEach(() => {
    resetGlobalFluentiContext()
    vi.unstubAllGlobals()
  })

  it('can be called multiple times to create independent contexts', () => {
    const ctx1 = createRoot(() => createFluenti({ locale: 'en', messages: enMessages }))
    const ctx2 = createRoot(() => createFluenti({ locale: 'ja', messages: jaMessages }))

    expect(ctx1.locale()).toBe('en')
    expect(ctx2.locale()).toBe('ja')
    expect(ctx1.t('hello')).toBe('Hello')
    expect(ctx2.t('hello')).toBe('こんにちは')
  })

  it('resetGlobalFluentiContext() clears global singleton', () => {
    const ctx = createRoot(() => createFluenti({ locale: 'en', messages: enMessages }))
    setGlobalFluentiContext(ctx)
    resetGlobalFluentiContext()

    // After reset, useI18n without provider should throw
    expect(() => render(() => {
      const { t } = useI18n()
      return <span>{t('hello')}</span>
    })).toThrow()
  })

  it('setGlobalFluentiContext() replaces the global context', () => {
    const ctx1 = createRoot(() => createFluenti({ locale: 'en', messages: enMessages }))
    setGlobalFluentiContext(ctx1)

    const ctx2 = createRoot(() => createFluenti({ locale: 'ja', messages: jaMessages }))
    setGlobalFluentiContext(ctx2)

    // setGlobalFluentiContext replaces without error
    expect(ctx2.locale()).toBe('ja')
  })

  it('allows replacement in HMR mode', () => {
    vi.stubGlobal('__fluenti_hmr__', true)

    createFluenti({ locale: 'en', messages: enMessages })
    expect(() => createFluenti({ locale: 'ja', messages: jaMessages })).not.toThrow()
  })
})

describe('multi-provider isolation', () => {
  afterEach(() => {
    resetGlobalFluentiContext()
  })

  it('two sibling providers render different locales', () => {
    const messages = {
      en: { hello: 'Hello' },
      ja: { hello: 'こんにちは' },
    }

    function EnChild() {
      const { t } = useI18n()
      return <span data-testid="en">{t('hello')}</span>
    }

    function JaChild() {
      const { t } = useI18n()
      return <span data-testid="ja">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <div>
        <I18nProvider locale="en" messages={messages}>
          <EnChild />
        </I18nProvider>
        <I18nProvider locale="ja" messages={messages}>
          <JaChild />
        </I18nProvider>
      </div>
    ))

    expect(getByTestId('en').textContent).toBe('Hello')
    expect(getByTestId('ja').textContent).toBe('こんにちは')
  })

  it('nested providers: inner overrides outer per-subtree', () => {
    const messages = {
      en: { hello: 'Hello' },
      fr: { hello: 'Bonjour' },
    }

    function OuterChild() {
      const { t } = useI18n()
      return <span data-testid="outer">{t('hello')}</span>
    }

    function InnerChild() {
      const { t } = useI18n()
      return <span data-testid="inner">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="en" messages={messages}>
        <OuterChild />
        <I18nProvider locale="fr" messages={messages}>
          <InnerChild />
        </I18nProvider>
      </I18nProvider>
    ))

    expect(getByTestId('outer').textContent).toBe('Hello')
    expect(getByTestId('inner').textContent).toBe('Bonjour')
  })

  it('provider takes priority over globalCtx', () => {
    const ctx = createRoot(() => createFluenti({ locale: 'en', messages: { en: { hello: 'Global Hello' } } }))
    setGlobalFluentiContext(ctx)

    function Child() {
      const { t } = useI18n()
      return <span data-testid="text">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="ja" messages={{ ja: { hello: 'Provider こんにちは' } }}>
        <Child />
      </I18nProvider>
    ))

    expect(getByTestId('text').textContent).toBe('Provider こんにちは')
  })

  it('sibling providers with independent setLocale', async () => {
    const messages = {
      en: { hello: 'Hello' },
      fr: { hello: 'Bonjour' },
      ja: { hello: 'こんにちは' },
    }

    let setLocaleA: (l: string) => Promise<void>

    function ChildA() {
      const { t, setLocale } = useI18n()
      setLocaleA = setLocale
      return <span data-testid="a">{t('hello')}</span>
    }

    function ChildB() {
      const { t } = useI18n()
      return <span data-testid="b">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <div>
        <I18nProvider locale="en" messages={messages}>
          <ChildA />
        </I18nProvider>
        <I18nProvider locale="ja" messages={messages}>
          <ChildB />
        </I18nProvider>
      </div>
    ))

    expect(getByTestId('a').textContent).toBe('Hello')
    expect(getByTestId('b').textContent).toBe('こんにちは')

    await setLocaleA!('fr')
    await Promise.resolve()

    expect(getByTestId('a').textContent).toBe('Bonjour')
    expect(getByTestId('b').textContent).toBe('こんにちは') // unchanged
  })
})
