import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { DateTime, I18nProvider } from '../src'

describe('DateTime', () => {
  afterEach(cleanup)

  it('formats a Date object with default style', () => {
    const date = new Date('2024-01-15T00:00:00.000Z')
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <DateTime value={date} />
      </I18nProvider>,
    )
    expect(screen.getByText(/2024|Jan/)).toBeDefined()
  })

  it('formats a numeric timestamp', () => {
    const ts = new Date('2024-06-01T00:00:00.000Z').getTime()
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <DateTime value={ts} />
      </I18nProvider>,
    )
    expect(screen.getByText(/2024|Jun/)).toBeDefined()
  })

  it('accepts a named style', () => {
    const date = new Date('2024-01-15T00:00:00.000Z')
    render(
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        dateFormats={{ long: { year: 'numeric', month: 'long', day: 'numeric' } }}
      >
        <DateTime value={date} style="long" />
      </I18nProvider>,
    )
    expect(screen.getByText(/January/)).toBeDefined()
  })

  it('throws when used outside provider', () => {
    expect(() =>
      render(<DateTime value={new Date()} />),
    ).toThrow('[fluenti] <DateTime> must be used within an <I18nProvider>')
  })
})
