import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { msg, I18nProvider, useI18n } from '../src'

describe('msg``', () => {
  afterEach(cleanup)
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
      const { i18n } = useI18n()
      return <span>{i18n.t(greeting)}</span>
    }

    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Display />
      </I18nProvider>,
    )

    expect(screen.getByText('Hello')).toBeDefined()
  })

  it('works in module-level constants', () => {
    const NAV_ITEMS = [
      { path: '/', label: msg`Home` },
      { path: '/settings', label: msg`Settings` },
    ]

    function Nav() {
      const { i18n } = useI18n()
      return (
        <nav>
          {NAV_ITEMS.map((item) => (
            <a key={item.path} href={item.path}>
              {i18n.t(item.label)}
            </a>
          ))}
        </nav>
      )
    }

    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Nav />
      </I18nProvider>,
    )

    expect(screen.getByText('Home')).toBeDefined()
    expect(screen.getByText('Settings')).toBeDefined()
  })
})
