import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@solidjs/testing-library'
import { DateTime, I18nProvider } from '../src'
import { resetGlobalI18nContext } from '../src/context'

describe('DateTime', () => {
  afterEach(() => {
    cleanup()
    resetGlobalI18nContext()
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
        <DateTime value={fixedDate} style="short" />
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
        <DateTime value={fixedDate} style="long" />
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
        <DateTime value={fixedDate} style="time" />
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
        <DateTime value={fixedDate} style="datetime" />
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
        <DateTime value={fixedDate} style="custom" />
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
        <DateTime value={fixedDate} style="nonexistent" />
      </I18nProvider>
    ))
    const expected = new Intl.DateTimeFormat('en').format(fixedDate)
    expect(getByText(expected)).toBeDefined()
  })

  it('throws when used outside of I18nProvider', () => {
    expect(() => render(() => <DateTime value={fixedDate} />)).toThrow(
      'useI18n requires either createI18n()',
    )
  })
})
