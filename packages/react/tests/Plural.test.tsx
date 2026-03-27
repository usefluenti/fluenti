import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { interpolate } from '../../core/src/interpolate'
import { I18nProvider } from '../src'
import { Plural } from '../src/components-entry'

describe('Plural', () => {
  afterEach(cleanup)
  it('selects correct form based on value — zero', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Plural value={0} zero="No messages" one="# message" other="# messages" />
      </I18nProvider>,
    )
    expect(screen.getByText('No messages')).toBeDefined()
  })

  it('selects correct form based on value — one', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Plural value={1} zero="No messages" one="# message" other="# messages" />
      </I18nProvider>,
    )
    // # should be replaced with the formatted number
    expect(screen.getByText('1 message')).toBeDefined()
  })

  it('selects correct form based on value — other', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Plural value={5} zero="No messages" one="# message" other="# messages" />
      </I18nProvider>,
    )
    expect(screen.getByText('5 messages')).toBeDefined()
  })

  it('falls back to other for missing forms', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Plural value={1} other="# items" />
      </I18nProvider>,
    )
    // Without a "one" form, it should fall back to "other"
    expect(screen.getByText('1 items')).toBeDefined()
  })

  it('handles offset prop', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Plural value={3} offset={1} one="# other person" other="# other people" />
      </I18nProvider>,
    )
    // offset=1, value=3, adjustedValue=2, so uses "other" form
    // # is replaced with the adjusted value (2)
    expect(screen.getByText('2 other people')).toBeDefined()
  })

  it('throws if used outside Provider', () => {
    expect(() =>
      render(<Plural value={1} other="items" />),
    ).toThrow('<Plural> must be used within an <I18nProvider>')
  })

  it('uses catalog translation for synthetic ICU plural messages', () => {
    render(
      <I18nProvider
        locale="ja"
        messages={{
          ja: {
            '{count, plural, =0 {No apples} one {# apple} other {# apples}}':
              '{count, plural, =0 {りんごなし} one {りんご # 個} other {りんご # 個}}',
          },
        }}
        interpolate={interpolate}
      >
        <Plural value={5} zero="No apples" one="# apple" other="# apples" />
      </I18nProvider>,
    )

    expect(screen.getByText('りんご 5 個')).toBeDefined()
  })

  it('negative value does not crash and selects a plural form', () => {
    // CLDR treats abs(-1) as "one" for English, so -1 maps to the "one" form
    render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Plural value={-1} zero="No items" one="# item" other="# items" />
      </I18nProvider>,
    )
    expect(screen.getByText('-1 item')).toBeDefined()
  })

  it('fractional value uses "other" form', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Plural value={0.5} zero="No items" one="# item" other="# items" />
      </I18nProvider>,
    )
    expect(screen.getByText('0.5 items')).toBeDefined()
  })

  it('NaN value does not crash', () => {
    const { container } = render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Plural value={NaN} zero="No items" one="# item" other="# items" />
      </I18nProvider>,
    )
    expect(container.innerHTML).toBeDefined()
  })

  it('Infinity value does not crash', () => {
    const { container } = render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Plural value={Infinity} zero="No items" one="# item" other="# items" />
      </I18nProvider>,
    )
    expect(container.innerHTML).toBeDefined()
  })

  it('only "other" prop works for all counts', () => {
    const { rerender } = render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Plural value={0} other="# items" />
      </I18nProvider>,
    )
    expect(screen.getByText('0 items')).toBeDefined()

    rerender(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Plural value={1} other="# items" />
      </I18nProvider>,
    )
    expect(screen.getByText('1 items')).toBeDefined()

    rerender(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <Plural value={42} other="# items" />
      </I18nProvider>,
    )
    expect(screen.getByText('42 items')).toBeDefined()
  })
})
