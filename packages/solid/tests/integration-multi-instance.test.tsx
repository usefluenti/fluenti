import { describe, it, expect, afterEach } from 'vitest'
import { render } from '@solidjs/testing-library'
import { I18nProvider, useI18n } from '../src'
import { resetGlobalFluentiContext } from '../src/context'

const allMessages = {
  en: { hello: 'Hello', welcome: 'Welcome {name}' },
  ja: { hello: 'こんにちは', welcome: 'ようこそ {name}' },
  fr: { hello: 'Bonjour', welcome: 'Bienvenue {name}' },
}

describe('integration: multi-provider rendering', () => {
  afterEach(() => {
    resetGlobalFluentiContext()
  })

  it('full page with two providers (en + ja) renders correct translations', () => {
    function Header() {
      const { t } = useI18n()
      return <h1 data-testid="header">{t('hello')}</h1>
    }

    function Sidebar() {
      const { t } = useI18n()
      return <aside data-testid="sidebar">{t('hello')}</aside>
    }

    const { getByTestId } = render(() => (
      <div>
        <I18nProvider locale="en" messages={allMessages}>
          <Header />
        </I18nProvider>
        <I18nProvider locale="ja" messages={allMessages}>
          <Sidebar />
        </I18nProvider>
      </div>
    ))

    expect(getByTestId('header').textContent).toBe('Hello')
    expect(getByTestId('sidebar').textContent).toBe('こんにちは')
  })

  it('locale switch in one provider does not affect the other', async () => {
    let setLocaleA: (l: string) => Promise<void>

    function CompA() {
      const { t, setLocale } = useI18n()
      setLocaleA = setLocale
      return <span data-testid="a">{t('hello')}</span>
    }

    function CompB() {
      const { t } = useI18n()
      return <span data-testid="b">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <div>
        <I18nProvider locale="en" messages={allMessages}>
          <CompA />
        </I18nProvider>
        <I18nProvider locale="ja" messages={allMessages}>
          <CompB />
        </I18nProvider>
      </div>
    ))

    expect(getByTestId('a').textContent).toBe('Hello')
    expect(getByTestId('b').textContent).toBe('こんにちは')

    await setLocaleA!('fr')
    await Promise.resolve()

    expect(getByTestId('a').textContent).toBe('Bonjour')
    expect(getByTestId('b').textContent).toBe('こんにちは') // must remain unchanged
  })

  it('loadMessages in one provider does not leak to another', async () => {
    let loadA: (locale: string, msgs: Record<string, string>) => void
    let setLocaleA: (l: string) => Promise<void>

    function CompA() {
      const { t, loadMessages, setLocale } = useI18n()
      loadA = loadMessages
      setLocaleA = setLocale
      return <span data-testid="a">{t('hello')}</span>
    }

    function CompB() {
      const { t } = useI18n()
      return <span data-testid="b">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <div>
        <I18nProvider locale="en" messages={allMessages}>
          <CompA />
        </I18nProvider>
        <I18nProvider locale="ja" messages={allMessages}>
          <CompB />
        </I18nProvider>
      </div>
    ))

    loadA!('de', { hello: 'Hallo' })
    await setLocaleA!('de')
    await Promise.resolve()

    expect(getByTestId('a').textContent).toBe('Hallo')
    expect(getByTestId('b').textContent).toBe('こんにちは') // provider B unaffected
  })
})
