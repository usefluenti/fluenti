import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { I18nProvider } from '../provider'
import { DateTime } from '../components/DateTime'

function withProvider(
  ui: React.ReactNode,
  locale = 'en',
  opts: { dateFormats?: Record<string, Intl.DateTimeFormatOptions> } = {},
) {
  return createElement(I18nProvider, {
    locale,
    messages: { [locale]: {} },
    ...(opts.dateFormats ? { dateFormats: opts.dateFormats } : {}),
    children: null,
  }, ui)
}

describe('DateTime edge cases', () => {
  // 1. No provider throws
  it('throws when used outside I18nProvider', () => {
    expect(() => {
      render(createElement(DateTime, { value: new Date() }))
    }).toThrow('[fluenti] <DateTime> must be used within an <I18nProvider>')
  })

  // 2. NaN
  it('handles NaN timestamp without crashing', () => {
    const { container } = render(
      withProvider(
        createElement(DateTime, { value: NaN }),
      ),
    )
    // NaN date may produce empty string or "Invalid Date" depending on environment
    expect(container).toBeDefined()
  })

  // 3. Custom style
  it('uses custom dateFormats style', () => {
    const dateFormats = {
      short: { year: 'numeric' as const, month: 'short' as const },
    }
    const date = new Date(2024, 0, 15)

    const { container } = render(
      withProvider(
        createElement(DateTime, { value: date, style: 'short' }),
        'en',
        { dateFormats },
      ),
    )
    // Should contain "Jan" and "2024"
    expect(container.textContent).toContain('Jan')
    expect(container.textContent).toContain('2024')
  })

  // 4. Different locale
  it('formats date according to locale', () => {
    const date = new Date(2024, 0, 15) // Jan 15, 2024

    const { container: enContainer } = render(
      withProvider(createElement(DateTime, { value: date }), 'en'),
    )
    const { container: jaContainer } = render(
      withProvider(createElement(DateTime, { value: date }), 'ja'),
    )
    // en and ja should produce different formatted strings
    expect(enContainer.textContent).not.toBe(jaContainer.textContent)
  })
})
