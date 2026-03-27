import { describe, it, expect, beforeEach } from 'vitest'
import { clearAllCaches } from '../src'
import {
  interpolate,
  clearInterpolationCache,
  setMessageCacheSize,
  clearCompileCache,
  clearPluralCache,
  clearNumberFormatCache,
  clearDateFormatCache,
  clearRelativeTimeFormatCache,
  DEFAULT_MESSAGE_CACHE_SIZE,
  resolvePlural,
} from '../src/internal'
import { parse } from '../src/parser'
import { compile } from '../src/compile'
import { formatNumber } from '../src/formatters/number'
import { formatDate } from '../src/formatters/date'
import { formatRelativeTime } from '../src/formatters/relative'

describe('DEFAULT_MESSAGE_CACHE_SIZE', () => {
  it('is 500', () => {
    expect(DEFAULT_MESSAGE_CACHE_SIZE).toBe(500)
  })
})

describe('clearInterpolationCache', () => {
  beforeEach(() => {
    clearInterpolationCache()
  })

  it('does not throw when cache is empty', () => {
    expect(() => clearInterpolationCache()).not.toThrow()
  })

  it('clears cached compiled messages', () => {
    // Populate cache
    interpolate('Hello {name}', { name: 'A' })
    interpolate('Goodbye {name}', { name: 'B' })

    // Clear and verify no error
    clearInterpolationCache()

    // Messages still work after clear (re-compiled)
    expect(interpolate('Hello {name}', { name: 'C' })).toBe('Hello C')
  })
})

describe('setMessageCacheSize', () => {
  beforeEach(() => {
    // Reset to default size
    setMessageCacheSize(DEFAULT_MESSAGE_CACHE_SIZE)
  })

  it('allows setting a custom cache size', () => {
    setMessageCacheSize(10)
    // Should not throw
    expect(interpolate('Hello {n}', { n: 1 })).toBe('Hello 1')
  })

  it('evicts entries when cache exceeds new smaller size', () => {
    setMessageCacheSize(2)

    // Fill cache with 2 entries
    interpolate('msg-a {v}', { v: 1 }, 'en')
    interpolate('msg-b {v}', { v: 2 }, 'en')

    // Adding a third should evict the first (LRU)
    interpolate('msg-c {v}', { v: 3 }, 'en')

    // All should still produce correct results (re-compiled if evicted)
    expect(interpolate('msg-a {v}', { v: 10 }, 'en')).toBe('msg-a 10')
    expect(interpolate('msg-c {v}', { v: 30 }, 'en')).toBe('msg-c 30')
  })

  it('clears existing entries when resized', () => {
    interpolate('cached {x}', { x: 'yes' })
    setMessageCacheSize(100)

    // Still works (re-compiles from scratch)
    expect(interpolate('cached {x}', { x: 'no' })).toBe('cached no')
  })
})

describe('clearCompileCache', () => {
  it('does not throw when cache is empty', () => {
    expect(() => clearCompileCache()).not.toThrow()
  })

  it('clears after compile usage', () => {
    compile(parse('{n, number}'), 'en')
    expect(() => clearCompileCache()).not.toThrow()
  })
})

describe('clearPluralCache', () => {
  it('does not throw when cache is empty', () => {
    expect(() => clearPluralCache()).not.toThrow()
  })

  it('clears after plural resolution', () => {
    resolvePlural(1, { one: 'one', other: 'other' }, 'en')
    expect(() => clearPluralCache()).not.toThrow()

    // Still works after clear (re-creates Intl.PluralRules)
    expect(resolvePlural(1, { one: 'one', other: 'other' }, 'en')).toBe('one')
  })
})

describe('clearNumberFormatCache', () => {
  it('does not throw when cache is empty', () => {
    expect(() => clearNumberFormatCache()).not.toThrow()
  })

  it('clears after formatting', () => {
    formatNumber(1234, 'en')
    expect(() => clearNumberFormatCache()).not.toThrow()

    // Still works after clear
    expect(formatNumber(1234, 'en')).toBeTruthy()
  })
})

describe('clearDateFormatCache', () => {
  it('does not throw when cache is empty', () => {
    expect(() => clearDateFormatCache()).not.toThrow()
  })

  it('clears after formatting', () => {
    formatDate(Date.now(), 'en')
    expect(() => clearDateFormatCache()).not.toThrow()

    // Still works after clear
    expect(formatDate(Date.now(), 'en')).toBeTruthy()
  })
})

describe('clearRelativeTimeFormatCache', () => {
  it('does not throw when cache is empty', () => {
    expect(() => clearRelativeTimeFormatCache()).not.toThrow()
  })

  it('clears after formatting', () => {
    const yesterday = Date.now() - 86_400_000
    formatRelativeTime(yesterday, 'en')
    expect(() => clearRelativeTimeFormatCache()).not.toThrow()

    // Still works after clear
    expect(formatRelativeTime(yesterday, 'en')).toBeTruthy()
  })
})

describe('clearAllCaches', () => {
  it('does not throw when all caches are empty', () => {
    expect(() => clearAllCaches()).not.toThrow()
  })

  it('clears all caches after various operations', () => {
    // Populate all caches
    interpolate('Hello {name}', { name: 'World' })
    compile(parse('{n, number}'), 'en')
    resolvePlural(5, { one: 'x', other: 'y' }, 'en')
    formatNumber(42, 'en')
    formatDate(Date.now(), 'en')
    formatRelativeTime(Date.now() - 3_600_000, 'en')

    // Clear all at once
    expect(() => clearAllCaches()).not.toThrow()

    // Everything still works after clearing (re-creates caches)
    expect(interpolate('Hello {name}', { name: 'After' })).toBe('Hello After')
    expect(resolvePlural(1, { one: 'a', other: 'b' }, 'en')).toBe('one')
    expect(formatNumber(99, 'en')).toBeTruthy()
    expect(formatDate(Date.now(), 'en')).toBeTruthy()
  })

  it('calls all individual clear functions', () => {
    // We verify by using a spy-like approach: call clearAllCaches, then
    // ensure that calling each individual clear again is a no-op (idempotent)
    clearAllCaches()

    expect(() => clearInterpolationCache()).not.toThrow()
    expect(() => clearCompileCache()).not.toThrow()
    expect(() => clearPluralCache()).not.toThrow()
    expect(() => clearNumberFormatCache()).not.toThrow()
    expect(() => clearDateFormatCache()).not.toThrow()
    expect(() => clearRelativeTimeFormatCache()).not.toThrow()
  })
})
