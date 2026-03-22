import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { useI18n, I18nProvider } from '../src'

describe('useI18n', () => {
  afterEach(cleanup)
  it('returns current locale', () => {
    function Display() {
      const { locale } = useI18n()
      return <span>{locale}</span>
    }

    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Display />
      </I18nProvider>,
    )

    expect(screen.getByText('en')).toBeDefined()
  })

  it('returns loadedLocales', () => {
    function Display() {
      const { loadedLocales } = useI18n()
      return <span>{[...loadedLocales].join(',')}</span>
    }

    render(
      <I18nProvider locale="en" messages={{ en: {}, fr: {} }}>
        <Display />
      </I18nProvider>,
    )

    expect(screen.getByText('en,fr')).toBeDefined()
  })

  it('throws if used outside Provider', () => {
    function BadChild() {
      const { locale } = useI18n()
      return <span>{locale}</span>
    }

    expect(() => render(<BadChild />)).toThrow(
      'useI18n() must be used within an <I18nProvider>',
    )
  })

  it('throws with helpful message mentioning I18nProvider', () => {
    function BadChild() {
      useI18n()
      return null
    }

    expect(() => render(<BadChild />)).toThrow('<I18nProvider>')
  })

  it('nested providers — inner provider context is used by inner components', () => {
    function Display() {
      const { locale, i18n } = useI18n()
      return (
        <span data-testid="inner">
          {locale}:{i18n.t('hello')}
        </span>
      )
    }

    function OuterDisplay() {
      const { locale, i18n } = useI18n()
      return (
        <span data-testid="outer">
          {locale}:{i18n.t('hello')}
        </span>
      )
    }

    render(
      <I18nProvider locale="en" messages={{ en: { hello: 'Hello' } }}>
        <OuterDisplay />
        <I18nProvider locale="fr" messages={{ fr: { hello: 'Bonjour' } }}>
          <Display />
        </I18nProvider>
      </I18nProvider>,
    )

    expect(screen.getByTestId('outer').textContent).toBe('en:Hello')
    expect(screen.getByTestId('inner').textContent).toBe('fr:Bonjour')
  })
})
