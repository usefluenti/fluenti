import { bench, describe } from 'vitest'
import { formatNumber } from '../src/formatters/number'
import { formatDate } from '../src/formatters/date'
import { formatRelativeTime } from '../src/formatters/relative'

const now = new Date(2025, 2, 15, 10, 30, 0)
const pastDate = new Date(2025, 2, 10, 10, 30, 0) // 5 days ago

describe('formatters', () => {
  describe('formatNumber', () => {
    bench('default', () => {
      formatNumber(1234.56, 'en')
    })

    bench('currency', () => {
      formatNumber(1234.56, 'en', 'currency')
    })

    bench('percent', () => {
      formatNumber(0.85, 'en', 'percent')
    })

    bench('decimal', () => {
      formatNumber(1234.5, 'en', 'decimal')
    })

    bench('currency — ja locale', () => {
      formatNumber(1234.56, 'ja', 'currency')
    })
  })

  describe('formatDate', () => {
    bench('default', () => {
      formatDate(now, 'en')
    })

    bench('short', () => {
      formatDate(now, 'en', 'short')
    })

    bench('long', () => {
      formatDate(now, 'en', 'long')
    })

    bench('time', () => {
      formatDate(now, 'en', 'time')
    })

    bench('datetime', () => {
      formatDate(now, 'en', 'datetime')
    })

    bench('short — ja locale', () => {
      formatDate(now, 'ja', 'short')
    })
  })

  describe('formatRelativeTime', () => {
    bench('5 days ago', () => {
      formatRelativeTime(pastDate, 'en')
    })

    bench('5 days ago — ja locale', () => {
      formatRelativeTime(pastDate, 'ja')
    })
  })
})
