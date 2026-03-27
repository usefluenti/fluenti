import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@solidjs/testing-library'
import { I18nProvider, useI18n } from '../src'
import { NumberFormat } from '../src/components/NumberFormat'

describe('NumberFormat', () => {
  afterEach(() => {
    cleanup()
  })

  it('formats an integer with grouping separators', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={1234567} />
      </I18nProvider>
    ))
    const expected = new Intl.NumberFormat('en').format(1234567)
    expect(getByText(expected)).toBeDefined()
  })

  it('formats a decimal number', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={1234.56} />
      </I18nProvider>
    ))
    const expected = new Intl.NumberFormat('en').format(1234.56)
    expect(getByText(expected)).toBeDefined()
  })

  it('formats zero', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={0} />
      </I18nProvider>
    ))
    expect(getByText('0')).toBeDefined()
  })

  it('formats negative numbers', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={-42.5} />
      </I18nProvider>
    ))
    const expected = new Intl.NumberFormat('en').format(-42.5)
    expect(container.textContent).toBe(expected)
  })

  it('formats very large numbers', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={9999999.99} />
      </I18nProvider>
    ))
    const expected = new Intl.NumberFormat('en').format(9999999.99)
    expect(getByText(expected)).toBeDefined()
  })

  it('formats with the built-in "percent" style', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={0.75} format="percent" />
      </I18nProvider>
    ))
    const expected = new Intl.NumberFormat('en', { style: 'percent' }).format(0.75)
    expect(getByText(expected)).toBeDefined()
  })

  it('formats with the built-in "decimal" style (fixed fraction digits)', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={3.1} format="decimal" />
      </I18nProvider>
    ))
    const expected = new Intl.NumberFormat('en', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(3.1)
    expect(getByText(expected)).toBeDefined()
  })

  it('formats with the built-in "currency" style (en locale = USD)', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={99.99} format="currency" />
      </I18nProvider>
    ))
    const expected = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: 'USD',
    }).format(99.99)
    expect(getByText(expected)).toBeDefined()
  })

  it('formats with currency style using locale-appropriate currency (de = EUR)', () => {
    const { container } = render(() => (
      <I18nProvider locale="de" messages={{ de: {} }}>
        <NumberFormat value={49.99} format="currency" />
      </I18nProvider>
    ))
    const expected = new Intl.NumberFormat('de', {
      style: 'currency',
      currency: 'EUR',
    }).format(49.99)
    expect(container.textContent).toBe(expected)
  })

  it('formats with currency style using locale-appropriate currency (ja = JPY)', () => {
    const { container } = render(() => (
      <I18nProvider locale="ja" messages={{ ja: {} }}>
        <NumberFormat value={1500} format="currency" />
      </I18nProvider>
    ))
    const expected = new Intl.NumberFormat('ja', {
      style: 'currency',
      currency: 'JPY',
    }).format(1500)
    expect(container.textContent).toBe(expected)
  })

  it('uses custom numberFormats from the provider', () => {
    const { getByText } = render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        numberFormats={{ compact: { notation: 'compact' as const } }}
      >
        <NumberFormat value={1500} format="compact" />
      </I18nProvider>
    ))
    const expected = new Intl.NumberFormat('en', { notation: 'compact' }).format(1500)
    expect(getByText(expected)).toBeDefined()
  })

  it('respects a different locale for default formatting (de)', () => {
    const { container } = render(() => (
      <I18nProvider locale="de" messages={{ de: {} }}>
        <NumberFormat value={1234.56} />
      </I18nProvider>
    ))
    const expected = new Intl.NumberFormat('de').format(1234.56)
    expect(container.textContent).toBe(expected)
  })

  it('falls back to default when given an unknown style', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={42} format="nonexistent" />
      </I18nProvider>
    ))
    const expected = new Intl.NumberFormat('en').format(42)
    expect(getByText(expected)).toBeDefined()
  })

  it('throws when used outside of I18nProvider', () => {
    expect(() => render(() => <NumberFormat value={42} />)).toThrow(
      'useI18n() must be used inside an <I18nProvider>.',
    )
  })

  // ─── Edge cases ──────────────────────────────────────────────────────

  it('formats NaN value', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={NaN} />
      </I18nProvider>
    ))

    const expected = new Intl.NumberFormat('en').format(NaN)
    expect(container.textContent).toBe(expected)
  })

  it('formats Infinity value', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={Infinity} />
      </I18nProvider>
    ))

    const expected = new Intl.NumberFormat('en').format(Infinity)
    expect(container.textContent).toBe(expected)
  })
})

// ─── #12 Inline format defaults edge cases ────────────────────────────────────

describe('Inline format defaults edge cases', () => {
  it('n(100, "currency") with unknown locale falls back to USD', () => {
    let result = ''

    function Child() {
      const { n } = useI18n()
      result = n(100, 'currency')
      return <span>{result}</span>
    }

    render(() => (
      <I18nProvider locale="zz-ZZ" messages={{ 'zz-ZZ': {} }}>
        <Child />
      </I18nProvider>
    ))

    // Should use USD fallback since 'zz-ZZ' is not in LOCALE_CURRENCY_MAP
    const expected = new Intl.NumberFormat('zz-ZZ', { style: 'currency', currency: 'USD' }).format(100)
    expect(result).toBe(expected)
  })

  it('user dateFormats override built-in defaults — user value wins', () => {
    let result = ''

    function Child() {
      const { d } = useI18n()
      result = d(new Date(2025, 0, 15), 'short')
      return <span>{result}</span>
    }

    // Override the built-in 'short' format with a custom one
    const customShort = { year: '2-digit' as const, month: '2-digit' as const, day: '2-digit' as const }

    render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        dateFormats={{ short: customShort }}
      >
        <Child />
      </I18nProvider>
    ))

    // The user-provided 'short' format should be used, not the built-in one
    const expected = new Intl.DateTimeFormat('en', customShort).format(new Date(2025, 0, 15))
    expect(result).toBe(expected)
  })

  it('user numberFormats override built-in defaults — user value wins', () => {
    let result = ''

    function Child() {
      const { n } = useI18n()
      result = n(0.75, 'percent')
      return <span>{result}</span>
    }

    // Override the built-in 'percent' format with a custom one that includes fraction digits
    const customPercent = { style: 'percent' as const, minimumFractionDigits: 2 }

    render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        numberFormats={{ percent: customPercent }}
      >
        <Child />
      </I18nProvider>
    ))

    // The user-provided 'percent' format should be used
    const expected = new Intl.NumberFormat('en', customPercent).format(0.75)
    expect(result).toBe(expected)
  })
})
