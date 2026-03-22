import { describe, it, expect } from 'vitest'
import { LRUCache, stableCacheKey } from '../src/lru'

describe('LRUCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBe(2)
  })

  it('returns undefined for missing keys', () => {
    const cache = new LRUCache<string, number>(3)
    expect(cache.get('missing')).toBeUndefined()
  })

  it('evicts least recently used entry when full', () => {
    const cache = new LRUCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3) // should evict 'a'
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })

  it('get() promotes entry to most recently used', () => {
    const cache = new LRUCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a') // promote 'a'
    cache.set('c', 3) // should evict 'b', not 'a'
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBe(3)
  })

  it('updates existing key without increasing size', () => {
    const cache = new LRUCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('a', 10)
    expect(cache.size).toBe(2)
    expect(cache.get('a')).toBe(10)
  })

  it('clear() removes all entries', () => {
    const cache = new LRUCache<string, number>(5)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeUndefined()
  })

  it('reports correct size', () => {
    const cache = new LRUCache<string, number>(5)
    expect(cache.size).toBe(0)
    cache.set('a', 1)
    expect(cache.size).toBe(1)
    cache.set('b', 2)
    expect(cache.size).toBe(2)
  })
})

describe('stableCacheKey', () => {
  it('returns locale when no options', () => {
    expect(stableCacheKey('en')).toBe('en')
    expect(stableCacheKey('en', undefined)).toBe('en')
    expect(stableCacheKey('en', {})).toBe('en')
  })

  it('produces same key regardless of property order', () => {
    const key1 = stableCacheKey('en', { style: 'currency', currency: 'USD' })
    const key2 = stableCacheKey('en', { currency: 'USD', style: 'currency' })
    expect(key1).toBe(key2)
  })

  it('produces different keys for different values', () => {
    const key1 = stableCacheKey('en', { style: 'currency' })
    const key2 = stableCacheKey('en', { style: 'percent' })
    expect(key1).not.toBe(key2)
  })

  it('produces different keys for different locales', () => {
    const key1 = stableCacheKey('en', { style: 'currency' })
    const key2 = stableCacheKey('de', { style: 'currency' })
    expect(key1).not.toBe(key2)
  })
})
