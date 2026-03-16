import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { I18nProvider } from '../provider'
import { NumberFormat } from '../components/Number'

function withProvider(
  ui: React.ReactNode,
  locale = 'en',
  opts: { numberFormats?: Record<string, Intl.NumberFormatOptions> } = {},
) {
  return createElement(I18nProvider, {
    locale,
    messages: { [locale]: {} },
    ...(opts.numberFormats ? { numberFormats: opts.numberFormats } : {}),
    children: null,
  }, ui)
}

describe('NumberFormat edge cases', () => {
  // 1. No provider throws
  it('throws when used outside I18nProvider', () => {
    expect(() => {
      render(createElement(NumberFormat, { value: 42 }))
    }).toThrow('[fluenti] <Number> must be used within an <I18nProvider>')
  })

  // 2. NaN
  it('handles NaN value', () => {
    const { container } = render(
      withProvider(
        createElement(NumberFormat, { value: NaN }),
      ),
    )
    expect(container.textContent).toBe('NaN')
  })

  // 3. Infinity
  it('handles Infinity value', () => {
    const { container } = render(
      withProvider(
        createElement(NumberFormat, { value: Infinity }),
      ),
    )
    // Intl.NumberFormat formats Infinity as the locale's infinity symbol
    expect(container.textContent).toContain('∞')
  })

  // 4. Custom style
  it('uses custom numberFormats style', () => {
    const numberFormats = {
      percent: { style: 'percent' as const },
    }

    const { container } = render(
      withProvider(
        createElement(NumberFormat, { value: 0.42, style: 'percent' }),
        'en',
        { numberFormats },
      ),
    )
    expect(container.textContent).toContain('42')
    expect(container.textContent).toContain('%')
  })
})
