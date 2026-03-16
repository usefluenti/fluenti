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
    formatNumber(1234.5, 'en')
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

  // ─── Edge values ───────────────────────────────────────────────────────

  it('handles NaN without crashing', () => {
    const result = formatRelativeTime(NaN, 'en')
    expect(result).toBe('')
  })

  it('handles Infinity without crashing', () => {
    const result = formatRelativeTime(Infinity, 'en')
    expect(result).toBe('')
  })

  it('handles -Infinity without crashing', () => {
    const result = formatRelativeTime(-Infinity, 'en')
    expect(result).toBe('')
  })

  it('handles invalid Date object without crashing', () => {
    const result = formatRelativeTime(new Date('invalid'), 'en')
    expect(result).toBe('')
  })
})

describe('edge cases - exhaustive', () => {
  // ─── formatNumber ───────────────────────────────────────────────────

  it('formatNumber built-in currency style', () => {
    const result = formatNumber(19.99, 'en-US', 'currency')
    expect(result).toContain('$')
    expect(result).toContain('19.99')
  })

  it('formatNumber built-in percent style', () => {
    const result = formatNumber(0.75, 'en', 'percent')
    expect(result).toContain('75')
    expect(result).toContain('%')
  })

  it('formatNumber built-in decimal style', () => {
    const result = formatNumber(3.1, 'en', 'decimal')
    expect(result).toBe('3.10')
  })

  it('formatNumber custom function style from defaults', () => {
    // currency is a function style in DEFAULT_NUMBER_FORMATS
    const result = formatNumber(100, 'ja', 'currency')
    expect(result).toContain('100')
  })

  it('formatNumber user style override replaces built-in', () => {
    const result = formatNumber(42, 'en', 'percent', {
      percent: { style: 'decimal', minimumFractionDigits: 3 },
    })
    expect(result).toBe('42.000')
  })

  it('formatNumber tiny number 0.000001', () => {
    const result = formatNumber(0.000001, 'en')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('formatNumber negative zero', () => {
    const result = formatNumber(-0, 'en')
    expect(typeof result).toBe('string')
  })

  it('formatNumber MAX_SAFE_INTEGER', () => {
    const result = formatNumber(Number.MAX_SAFE_INTEGER, 'en')
    expect(result).toBeTruthy()
    expect(result).toContain('9')
  })

  // ─── formatDate ─────────────────────────────────────────────────────

  it('formatDate built-in short style', () => {
    const date = new Date(2024, 5, 15)
    const result = formatDate(date, 'en', 'short')
    expect(result).toContain('2024')
  })

  it('formatDate built-in long style', () => {
    const date = new Date(2024, 0, 15)
    const result = formatDate(date, 'en', 'long')
    expect(result).toContain('January')
    expect(result).toContain('2024')
  })

  it('formatDate built-in time style', () => {
    const date = new Date(2024, 0, 15, 14, 30)
    const result = formatDate(date, 'en', 'time')
    expect(result).toBeTruthy()
  })

  it('formatDate built-in datetime style', () => {
    const date = new Date(2024, 0, 15, 14, 30)
    const result = formatDate(date, 'en', 'datetime')
    expect(result).toContain('2024')
  })

  it('formatDate user style override', () => {
    const date = new Date(2024, 0, 15)
    const result = formatDate(date, 'en', 'short', {
      short: { dateStyle: 'full' },
    })
    expect(result).toContain('January')
  })

  it('formatDate negative timestamp (before epoch)', () => {
    // Jan 1, 1960
    const result = formatDate(-315619200000, 'en')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('formatDate ancient date (year 1000)', () => {
    const ancient = new Date('1000-06-15')
    const result = formatDate(ancient, 'en')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('formatDate far future (year 9999)', () => {
    const future = new Date('9999-12-31')
    const result = formatDate(future, 'en')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  // ─── formatRelativeTime ─────────────────────────────────────────────

  it('formatRelativeTime week', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(twoWeeksAgo, 'en')
    expect(result).toContain('2')
    expect(result.toLowerCase()).toContain('week')
  })

  it('formatRelativeTime month', () => {
    const twoMonthsAgo = new Date(Date.now() - 61 * 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(twoMonthsAgo, 'en')
    expect(result).toContain('2')
    expect(result.toLowerCase()).toContain('month')
  })

  it('formatRelativeTime year', () => {
    const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(twoYearsAgo, 'en')
    expect(result).toContain('2')
    expect(result.toLowerCase()).toContain('year')
  })

  it('formatRelativeTime exactly 0ms (now)', () => {
    const result = formatRelativeTime(Date.now(), 'en')
    expect(result).toBeTruthy()
    // Should be "now" or "0 seconds ago" or similar
    expect(typeof result).toBe('string')
  })

  it('formatRelativeTime different locales (ja)', () => {
    const past = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const result = formatRelativeTime(past, 'ja')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('formatRelativeTime different locales (de)', () => {
    const past = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const result = formatRelativeTime(past, 'de')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('formatRelativeTime Date object input', () => {
    const dateObj = new Date(Date.now() - 5 * 60 * 1000) // 5 min ago
    const result = formatRelativeTime(dateObj, 'en')
    expect(result).toContain('5')
    expect(result.toLowerCase()).toContain('minute')
  })

  it('formatRelativeTime 100 years ago', () => {
    const longAgo = Date.now() - 100 * 365.25 * 24 * 60 * 60 * 1000
    const result = formatRelativeTime(longAgo, 'en')
    expect(result).toContain('100')
    expect(result.toLowerCase()).toContain('year')
  })

  it('formatRelativeTime 100 years ahead', () => {
    const farFuture = Date.now() + 100 * 365.25 * 24 * 60 * 60 * 1000
    const result = formatRelativeTime(farFuture, 'en')
    expect(result).toContain('100')
    expect(result.toLowerCase()).toContain('year')
  })
})
