/**
 * Simple LRU cache backed by a Map.
 * Relies on Map's insertion-order iteration for eviction.
 */
export class LRUCache<K, V> {
  private readonly cache = new Map<K, V>()
  private readonly max: number

  constructor(max: number) {
    this.max = max
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.max) {
      // Evict least recently used (first entry)
      const firstKey = this.cache.keys().next().value as K
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  get size(): number {
    return this.cache.size
  }

  clear(): void {
    this.cache.clear()
  }
}

/**
 * Generate a stable cache key from a locale and an options object.
 * Sorts object keys to ensure `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` produce the same key.
 */
export function stableCacheKey(locale: string, options?: Record<string, unknown>): string {
  if (!options || Object.keys(options).length === 0) return locale
  const sorted = Object.keys(options).sort().map(k => `${k}:${JSON.stringify(options[k])}`).join(',')
  return `${locale}:{${sorted}}`
}
