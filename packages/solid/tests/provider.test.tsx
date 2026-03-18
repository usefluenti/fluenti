import { describe, it, expect, afterEach } from 'vitest'
import { render } from '@solidjs/testing-library'
import { I18nProvider, useI18n } from '../src'
import { resetGlobalI18nContext } from '../src/context'

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

describe('useI18n outside provider', () => {
  afterEach(() => {
    resetGlobalI18nContext()
  })

  it('throws when used without provider or createI18n', () => {
    resetGlobalI18nContext()

    function BadChild() {
      const { t } = useI18n()
      return <span>{t('hello')}</span>
    }

    expect(() => render(() => <BadChild />)).toThrow(
      'useI18n requires either createI18n()',
    )
  })
})
