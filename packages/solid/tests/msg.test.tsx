import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@solidjs/testing-library'
import { msg, I18nProvider, useI18n } from '../src'
import { resetGlobalI18nContext } from '../src/context'

describe('msg``', () => {
  afterEach(() => {
    cleanup()
    resetGlobalI18nContext()
  })

  it('creates MessageDescriptor, not a string', () => {
    const descriptor = msg`Hello World`
    expect(typeof descriptor).toBe('object')
    expect(descriptor).toHaveProperty('id')
    expect(descriptor).toHaveProperty('message')
    expect(typeof descriptor.id).toBe('string')
    expect(descriptor.message).toBe('Hello World')
  })

  it('resolves when passed to t() inside component', () => {
    const greeting = msg`Hello`

    function Display() {
      const { t } = useI18n()
      return <span>{t(greeting)}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Display />
      </I18nProvider>
    ))

    expect(getByText('Hello')).toBeDefined()
  })

  it('works in module-level constants', () => {
    const NAV_ITEMS = [
      { path: '/', label: msg`Home` },
      { path: '/settings', label: msg`Settings` },
    ]

    function Nav() {
      const { t } = useI18n()
      return (
        <nav>
          {NAV_ITEMS.map((item) => (
            <a href={item.path}>
              {t(item.label)}
            </a>
          ))}
        </nav>
      )
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Nav />
      </I18nProvider>
    ))

    expect(getByText('Home')).toBeDefined()
    expect(getByText('Settings')).toBeDefined()
  })
})
