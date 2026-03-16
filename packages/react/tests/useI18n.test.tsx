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
      return <span>{loadedLocales.join(',')}</span>
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
})
