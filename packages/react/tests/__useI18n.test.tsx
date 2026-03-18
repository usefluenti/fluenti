import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { I18nProvider } from '../src'
import { __useI18n } from '../src/hooks/__useI18n'

describe('__useI18n (internal hook)', () => {
  afterEach(cleanup)
  it('returns the i18n instance with t()', () => {
    function Display() {
      const i18n = __useI18n()
      return <span>{i18n.t('hello')}</span>
    }

    render(
      <I18nProvider locale="en" messages={{ en: { hello: 'Hello' } }}>
        <Display />
      </I18nProvider>,
    )

    expect(screen.getByText('Hello')).toBeDefined()
  })

  it('throws if used outside Provider', () => {
    function BadChild() {
      const i18n = __useI18n()
      return <span>{i18n.t('hello')}</span>
    }

    expect(() => render(<BadChild />)).toThrow(
      '__useI18n() must be used within an <I18nProvider>',
    )
  })

  it('supports interpolation', () => {
    function Display() {
      const i18n = __useI18n()
      return <span>{i18n.t('greeting', { name: 'Alice' })}</span>
    }

    render(
      <I18nProvider locale="en" messages={{ en: { greeting: 'Hello {name}!' } }}>
        <Display />
      </I18nProvider>,
    )

    expect(screen.getByText('Hello Alice!')).toBeDefined()
  })
})
