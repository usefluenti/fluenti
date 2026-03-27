import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { interpolate } from '../../core/src/interpolate'
import { I18nProvider } from '../src'
import { DateTime } from '../src/components-entry'

describe('DateTime', () => {
  afterEach(cleanup)

  const fixedDate = new Date('2024-06-15T12:30:00Z')
  const fixedTimestamp = fixedDate.getTime()

  it('formats a Date object with default style', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <DateTime value={fixedDate} />
      </I18nProvider>,
    )
    const expected = new Intl.DateTimeFormat('en').format(fixedDate)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('formats a numeric timestamp with default style', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <DateTime value={fixedTimestamp} />
      </I18nProvider>,
    )
    const expected = new Intl.DateTimeFormat('en').format(fixedTimestamp)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('formats with the built-in "short" style', () => {
    render(
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        interpolate={interpolate}
        dateFormats={{
          short: { year: 'numeric', month: 'numeric', day: 'numeric' },
        }}
      >
        <DateTime value={fixedDate} format="short" />
      </I18nProvider>,
    )
    const expected = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).format(fixedDate)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('formats with the built-in "long" style', () => {
    render(
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        interpolate={interpolate}
        dateFormats={{
          long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
        }}
      >
        <DateTime value={fixedDate} format="long" />
      </I18nProvider>,
    )
    const expected = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(fixedDate)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('formats with the built-in "time" style', () => {
    render(
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        interpolate={interpolate}
        dateFormats={{
          time: { hour: 'numeric', minute: 'numeric' },
        }}
      >
        <DateTime value={fixedDate} format="time" />
      </I18nProvider>,
    )
    const expected = new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: 'numeric',
    }).format(fixedDate)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('formats with the built-in "datetime" style', () => {
    render(
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        interpolate={interpolate}
        dateFormats={{
          datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' },
        }}
      >
        <DateTime value={fixedDate} format="datetime" />
      </I18nProvider>,
    )
    const expected = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(fixedDate)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('uses custom dateFormats from the provider', () => {
    render(
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        dateFormats={{ custom: { year: '2-digit', month: '2-digit' } }}
        interpolate={interpolate}
      >
        <DateTime value={fixedDate} format="custom" />
      </I18nProvider>,
    )
    const expected = new Intl.DateTimeFormat('en', {
      year: '2-digit',
      month: '2-digit',
    }).format(fixedDate)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('respects a different locale (de)', () => {
    render(
      <I18nProvider locale="de" messages={{ de: {} }} interpolate={interpolate}>
        <DateTime value={fixedDate} />
      </I18nProvider>,
    )
    const expected = new Intl.DateTimeFormat('de').format(fixedDate)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('respects a different locale (ja)', () => {
    render(
      <I18nProvider locale="ja" messages={{ ja: {} }} interpolate={interpolate}>
        <DateTime value={fixedDate} />
      </I18nProvider>,
    )
    const expected = new Intl.DateTimeFormat('ja').format(fixedDate)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('falls back to default when given an unknown style', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <DateTime value={fixedDate} format="nonexistent" />
      </I18nProvider>,
    )
    const expected = new Intl.DateTimeFormat('en').format(fixedDate)
    expect(screen.getByText(expected)).toBeDefined()
  })

  it('throws when used outside of I18nProvider', () => {
    expect(() => render(<DateTime value={fixedDate} />)).toThrow(
      '[fluenti] <DateTime> must be used within an <I18nProvider>',
    )
  })
})
