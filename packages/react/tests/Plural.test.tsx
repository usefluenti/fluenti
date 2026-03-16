import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Plural, I18nProvider } from '../src'

describe('Plural', () => {
  afterEach(cleanup)
  it('selects correct form based on value — zero', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={0} zero="No messages" one="# message" other="# messages" />
      </I18nProvider>,
    )
    expect(screen.getByText('No messages')).toBeDefined()
  })

  it('selects correct form based on value — one', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={1} zero="No messages" one="# message" other="# messages" />
      </I18nProvider>,
    )
    // # should be replaced with the formatted number
    expect(screen.getByText('1 message')).toBeDefined()
  })

  it('selects correct form based on value — other', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={5} zero="No messages" one="# message" other="# messages" />
      </I18nProvider>,
    )
    expect(screen.getByText('5 messages')).toBeDefined()
  })

  it('falls back to other for missing forms', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={1} other="# items" />
      </I18nProvider>,
    )
    // Without a "one" form, it should fall back to "other"
    expect(screen.getByText('1 items')).toBeDefined()
  })

  it('handles offset prop', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={3} offset={1} one="# other person" other="# other people" />
      </I18nProvider>,
    )
    // offset=1, value=3, adjustedValue=2, so uses "other" form
    // # is replaced with the original value (3)
    expect(screen.getByText('3 other people')).toBeDefined()
  })

  it('throws if used outside Provider', () => {
    expect(() =>
      render(<Plural value={1} other="items" />),
    ).toThrow('<Plural> must be used within an <I18nProvider>')
  })
})
