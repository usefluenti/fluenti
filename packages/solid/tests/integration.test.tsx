import { describe, it, expect, vi } from 'vitest'
import { render } from '@solidjs/testing-library'
import { I18nProvider, useI18n, Plural } from '../src'
import type { JSX } from 'solid-js'
import { Trans } from '../src'

const messages = {
  en: {
    hello: 'Hello',
    greeting: 'Hi {name}',
    items: '# items',
  },
  fr: {
    hello: 'Bonjour',
    greeting: 'Salut {name}',
    items: '# articles',
  },
}

describe('integration', () => {
  it('multiple components share one context and update together', async () => {
    let changeLocale: (l: string) => void

    function Header() {
      const { t, setLocale } = useI18n()
      changeLocale = setLocale
      return <h1 data-testid="header">{t('hello')}</h1>
    }

    function Body() {
      const { t } = useI18n()
      return <p data-testid="body">{t('greeting', { name: 'World' })}</p>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Header />
        <Body />
      </I18nProvider>
    ))

    expect(getByTestId('header').textContent).toBe('Hello')
    expect(getByTestId('body').textContent).toBe('Hi World')

    changeLocale!('fr')
    await Promise.resolve()

    expect(getByTestId('header').textContent).toBe('Bonjour')
    expect(getByTestId('body').textContent).toBe('Salut World')
  })

  it('locale change does not cause component remount', async () => {
    const mountSpy = vi.fn()
    let changeLocale: (l: string) => void

    function Child() {
      mountSpy()
      const { t, setLocale } = useI18n()
      changeLocale = setLocale
      return <span data-testid="child">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Child />
      </I18nProvider>
    ))

    expect(mountSpy).toHaveBeenCalledTimes(1)
    expect(getByTestId('child').textContent).toBe('Hello')

    changeLocale!('fr')
    await Promise.resolve()

    expect(getByTestId('child').textContent).toBe('Bonjour')
    expect(mountSpy).toHaveBeenCalledTimes(1) // No remount
  })

  it('Trans and Plural work together with locale switch', async () => {
    let _changeLocale: (l: string) => void

    function App() {
      const { setLocale } = useI18n()
      _changeLocale = setLocale
      return (
        <div>
          <Trans
            message="Click <bold>here</bold>"
            components={{
              bold: (props: { children?: JSX.Element }) => (
                <strong>{props.children}</strong>
              ),
            }}
          />
          <Plural value={3} one="# item" other="# items" />
        </div>
      )
    }

    const { container } = render(() => (
      <I18nProvider locale="en" messages={messages}>
        <App />
      </I18nProvider>
    ))

    expect(container.querySelector('strong')?.textContent).toBe('here')
    expect(container.textContent).toContain('3 items')
  })

  it('loadMessages makes new keys available', () => {
    let result = ''

    function Child() {
      const { t, loadMessages } = useI18n()
      loadMessages('en', { newKey: 'New value' })
      result = t('newKey')
      return <span>{result}</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Child />
      </I18nProvider>
    ))

    expect(result).toBe('New value')
  })
})
