import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { NumberFormat, I18nProvider } from '../src'

describe('NumberFormat', () => {
  afterEach(cleanup)

  it('formats an integer', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={1234} />
      </I18nProvider>,
    )
    expect(screen.getByText('1,234')).toBeDefined()
  })

  it('formats a decimal number', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={1234.56} />
      </I18nProvider>,
    )
    expect(screen.getByText('1,234.56')).toBeDefined()
  })

  it('formats zero', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={0} />
      </I18nProvider>,
    )
    expect(screen.getByText('0')).toBeDefined()
  })

  it('formats negative numbers', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={-42} />
      </I18nProvider>,
    )
    const el = screen.getByText(/42/)
    expect(el.textContent).toContain('42')
  })

  it('accepts a named style', () => {
    render(
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        numberFormats={{ percent: { style: 'percent' } }}
      >
        <NumberFormat value={0.75} style="percent" />
      </I18nProvider>,
    )
    expect(screen.getByText('75%')).toBeDefined()
  })

  it('throws when used outside provider', () => {
    expect(() =>
      render(<NumberFormat value={42} />),
    ).toThrow('[fluenti] <Number> must be used within an <I18nProvider>')
  })
})
