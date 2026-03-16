import { describe, it, expect } from 'vitest'
import { formatNumber } from '../src/formatters/number'
import { formatDate } from '../src/formatters/date'
import { formatRelativeTime } from '../src/formatters/relative'

describe('formatNumber', () => {
  it('formats a basic number', () => {
    const result = formatNumber(1234.5, 'en')
    expect(result).toContain('1')
    expect(result).toContain('234')
  })

  it('formats with named style', () => {
    const result = formatNumber(42, 'en', 'integer', {
      integer: { maximumFractionDigits: 0 },
    })
    expect(result).toBe('42')
  })

  it('formats with function style', () => {
    const result = formatNumber(1000, 'en', 'custom', {
      custom: (_locale) => ({ minimumFractionDigits: 2 }),
    })
    expect(result).toContain('1')
    expect(result).toContain('00')
  })

  it('formats with currency style', () => {
    const result = formatNumber(19.99, 'en-US', 'price', {
      price: { style: 'currency', currency: 'USD' },
    })
    expect(result).toContain('19.99')
    expect(result).toContain('$')
  })

  it('formats number for different locales', () => {
    const _en = formatNumber(1234.5, 'en')
    const de = formatNumber(1234.5, 'de')
    // German uses comma as decimal separator
    expect(de).toContain(',')
  })

  it('ignores unknown style', () => {
    const result = formatNumber(42, 'en', 'unknown', {})
    expect(result).toBe('42')
  })

  // ─── Edge values ───────────────────────────────────────────────────────

  it('formats NaN', () => {
    const result = formatNumber(NaN, 'en')
    expect(result).toBe('NaN')
  })

  it('formats Infinity', () => {
    const result = formatNumber(Infinity, 'en')
    expect(result).toContain('∞')
  })

  it('formats -Infinity', () => {
    const result = formatNumber(-Infinity, 'en')
    expect(result).toContain('∞')
  })

  it('formats 0', () => {
    const result = formatNumber(0, 'en')
    expect(result).toBe('0')
  })
})

describe('formatDate', () => {
  const date = new Date(2024, 0, 15)

  it('formats a date with default style', () => {
    const result = formatDate(date, 'en')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('formats a date with named style', () => {
    const result = formatDate(date, 'en', 'full', {
      full: { dateStyle: 'full' },
    })
    expect(result).toContain('January')
    expect(result).toContain('2024')
  })

  it('formats a timestamp', () => {
    const result = formatDate(date.getTime(), 'en')
    expect(result).toBeTruthy()
  })

  it('formats date for different locale', () => {
    const result = formatDate(date, 'de', 'short', {
      short: { dateStyle: 'short' },
    })
    expect(result).toBeTruthy()
  })

  it('handles relative style', () => {
    // Use a date in the recent past
    const recent = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    const result = formatDate(recent, 'en', 'relative', {
      relative: 'relative',
    })
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  // ─── Edge values ───────────────────────────────────────────────────────

  it('handles NaN timestamp without throwing', () => {
    const result = formatDate(NaN, 'en')
    expect(typeof result).toBe('string')
  })

  it('handles epoch 0 timestamp', () => {
    const result = formatDate(0, 'en')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('handles invalid Date object without throwing', () => {
    const result = formatDate(new Date('invalid'), 'en')
    expect(typeof result).toBe('string')
  })
})

describe('formatRelativeTime', () => {
  it('formats seconds ago', () => {
    const past = Date.now() - 30 * 1000
    const result = formatRelativeTime(past, 'en')
    expect(result).toBeTruthy()
  })

  it('formats hours ago', () => {
    const past = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const result = formatRelativeTime(past, 'en')
    expect(result).toContain('3')
    expect(result.toLowerCase()).toContain('hour')
  })

  it('formats days ago', () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(past, 'en')
    expect(result).toContain('2')
    expect(result.toLowerCase()).toContain('day')
  })

  it('formats future dates', () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(future, 'en')
    expect(result).toContain('5')
    expect(result.toLowerCase()).toContain('day')
  })
})
