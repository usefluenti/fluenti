import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { NumberFormat, I18nProvider } from '../src'

describe('NumberFormat', () => {
  afterEach(cleanup)

  it('formats an integer with grouping separators', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={1234567} />
      </I18nProvider>,
    )
    const expected = new Intl.NumberFormat('en').format(1234567)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('formats a decimal number', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={1234.56} />
      </I18nProvider>,
    )
    const expected = new Intl.NumberFormat('en').format(1234.56)
    expect(screen.getByText(expected)).toBeDefined()
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
    const { container } = render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={-42.5} />
      </I18nProvider>,
    )
    const expected = new Intl.NumberFormat('en').format(-42.5)
    expect(container.textContent).toBe(expected)
  })

  it('formats very large numbers', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={9999999.99} />
      </I18nProvider>,
    )
    const expected = new Intl.NumberFormat('en').format(9999999.99)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('formats with the built-in "percent" style', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={0.75} style="percent" />
      </I18nProvider>,
    )
    const expected = new Intl.NumberFormat('en', { style: 'percent' }).format(0.75)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('formats with the built-in "decimal" style (fixed fraction digits)', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={3.1} style="decimal" />
      </I18nProvider>,
    )
    const expected = new Intl.NumberFormat('en', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(3.1)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('formats with the built-in "currency" style (en locale = USD)', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={99.99} style="currency" />
      </I18nProvider>,
    )
    const expected = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: 'USD',
    }).format(99.99)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('formats with currency style using locale-appropriate currency (de = EUR)', () => {
    const { container } = render(
      <I18nProvider locale="de" messages={{ de: {} }}>
        <NumberFormat value={49.99} style="currency" />
      </I18nProvider>,
    )
    const expected = new Intl.NumberFormat('de', {
      style: 'currency',
      currency: 'EUR',
    }).format(49.99)
    expect(container.textContent).toBe(expected)
  })

  it('formats with currency style using locale-appropriate currency (ja = JPY)', () => {
    const { container } = render(
      <I18nProvider locale="ja" messages={{ ja: {} }}>
        <NumberFormat value={1500} style="currency" />
      </I18nProvider>,
    )
    const expected = new Intl.NumberFormat('ja', {
      style: 'currency',
      currency: 'JPY',
    }).format(1500)
    expect(container.textContent).toBe(expected)
  })

  it('uses custom numberFormats from the provider', () => {
    render(
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        numberFormats={{ compact: { notation: 'compact' as const } }}
      >
        <NumberFormat value={1500} style="compact" />
      </I18nProvider>,
    )
    const expected = new Intl.NumberFormat('en', { notation: 'compact' }).format(1500)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('respects a different locale for default formatting (de)', () => {
    const { container } = render(
      <I18nProvider locale="de" messages={{ de: {} }}>
        <NumberFormat value={1234.56} />
      </I18nProvider>,
    )
    const expected = new Intl.NumberFormat('de').format(1234.56)
    expect(container.textContent).toBe(expected)
  })

  it('falls back to default when given an unknown style', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={42} style="nonexistent" />
      </I18nProvider>,
    )
    const expected = new Intl.NumberFormat('en').format(42)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('throws when used outside of I18nProvider', () => {
    expect(() => render(<NumberFormat value={42} />)).toThrow(
      '[fluenti] <Number> must be used within an <I18nProvider>',
    )
  })
})
