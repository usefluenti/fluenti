import type { Locale } from './types'
import { parse } from './parser'
import { compile } from './compile'

const LRU_MAX = 500

/**
 * Simple LRU cache backed by a Map.
 * Relies on Map's insertion-order iteration for eviction.
 */
class LRUCache<K, V> {
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

type CompiledFn = string | ((values?: Record<string, unknown>) => string)

const compiledCache = new LRUCache<string, CompiledFn>(LRU_MAX)

/**
 * Parse, compile, and execute an ICU message with the given values and locale.
 *
 * Compiled messages are cached in an LRU cache (500 entries max) keyed
 * by `locale:message` for fast repeated lookups.
 *
 * @param message - ICU MessageFormat string
 * @param values - Interpolation values
 * @param locale - BCP 47 locale string (defaults to 'en')
 * @returns Interpolated string
 */
export function interpolate(
  message: string,
  values?: Record<string, unknown>,
  locale?: Locale,
): string {
  const effectiveLocale = locale ?? 'en'
  const cacheKey = `${effectiveLocale}:${message}`

  let compiled = compiledCache.get(cacheKey)
  if (compiled === undefined) {
    const ast = parse(message)
    compiled = compile(ast, effectiveLocale)
    compiledCache.set(cacheKey, compiled)
  }

  if (typeof compiled === 'string') {
    return compiled
  }

  return compiled(values)
}
