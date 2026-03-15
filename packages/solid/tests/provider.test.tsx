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
