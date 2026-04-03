import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@solidjs/testing-library'
import { I18nProvider } from '../src'
import { DateTime } from '../src/components/DateTime'
import { __resetFluentiGlobalStateForTests } from '../src/context'

describe('DateTime', () => {
  afterEach(() => {
    cleanup()
    __resetFluentiGlobalStateForTests()
  })

  const fixedDate = new Date('2024-06-15T12:30:00Z')
  const fixedTimestamp = fixedDate.getTime()

  it('formats a Date object with default style', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <DateTime value={fixedDate} />
      </I18nProvider>
    ))
    const expected = new Intl.DateTimeFormat('en').format(fixedDate)
    expect(getByText(expected)).toBeDefined()
  })

  it('formats a numeric timestamp with default style', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <DateTime value={fixedTimestamp} />
      </I18nProvider>
    ))
    const expected = new Intl.DateTimeFormat('en').format(fixedTimestamp)
    expect(getByText(expected)).toBeDefined()
  })

  it('formats with the built-in "short" style', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <DateTime value={fixedDate} format="short" />
      </I18nProvider>
    ))
    const expected = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).format(fixedDate)
    expect(getByText(expected)).toBeDefined()
  })

  it('formats with the built-in "long" style', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <DateTime value={fixedDate} format="long" />
      </I18nProvider>
    ))
    const expected = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(fixedDate)
    expect(getByText(expected)).toBeDefined()
  })

  it('formats with the built-in "time" style', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <DateTime value={fixedDate} format="time" />
      </I18nProvider>
    ))
    const expected = new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: 'numeric',
    }).format(fixedDate)
    expect(getByText(expected)).toBeDefined()
  })

  it('formats with the built-in "datetime" style', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <DateTime value={fixedDate} format="datetime" />
      </I18nProvider>
    ))
    const expected = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(fixedDate)
    expect(getByText(expected)).toBeDefined()
  })

  it('uses custom dateFormats from the provider', () => {
    const { getByText } = render(() => (
      <I18nProvider
        locale="en"
        messages={{ en: {} }}
        dateFormats={{ custom: { year: '2-digit', month: '2-digit' } }}
      >
        <DateTime value={fixedDate} format="custom" />
      </I18nProvider>
    ))
    const expected = new Intl.DateTimeFormat('en', {
      year: '2-digit',
      month: '2-digit',
    }).format(fixedDate)
    expect(getByText(expected)).toBeDefined()
  })

  it('respects a different locale (de)', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="de" messages={{ de: {} }}>
        <DateTime value={fixedDate} />
      </I18nProvider>
    ))
    const expected = new Intl.DateTimeFormat('de').format(fixedDate)
    expect(getByText(expected)).toBeDefined()
  })

  it('respects a different locale (ja)', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="ja" messages={{ ja: {} }}>
        <DateTime value={fixedDate} />
      </I18nProvider>
    ))
    const expected = new Intl.DateTimeFormat('ja').format(fixedDate)
    expect(getByText(expected)).toBeDefined()
  })

  it('falls back to default when given an unknown style', () => {
    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <DateTime value={fixedDate} format="nonexistent" />
      </I18nProvider>
    ))
    const expected = new Intl.DateTimeFormat('en').format(fixedDate)
    expect(getByText(expected)).toBeDefined()
  })

  it('uses the development fallback when used outside of I18nProvider', () => {
    const expected = new Intl.DateTimeFormat('en').format(fixedDate)
    const { getByText } = render(() => <DateTime value={fixedDate} />)
    expect(getByText(expected)).toBeDefined()
  })

  // ─── Edge cases ──────────────────────────────────────────────────────

  it('handles NaN timestamp gracefully', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <DateTime value={NaN} />
      </I18nProvider>
    ))

    // Intl.DateTimeFormat with NaN produces "Invalid Date" in some envs
    expect(container.textContent).toBeDefined()
  })

  it('handles invalid date object', () => {
    const invalidDate = new Date('not-a-date')

    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <DateTime value={invalidDate} />
      </I18nProvider>
    ))

    // Should render something (even if it's "Invalid Date")
    expect(container.textContent).toBeDefined()
  })
})
