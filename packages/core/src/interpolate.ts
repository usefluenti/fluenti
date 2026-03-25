import type { CustomFormatter, Locale } from './types'
import { parse } from './parser'
import { compile } from './compile'
import { LRUCache } from './lru'

/** Default LRU cache size for compiled messages. */
export const DEFAULT_MESSAGE_CACHE_SIZE = 500

type CompiledFn = string | ((values?: Record<string, unknown>) => string)

let compiledCache = new LRUCache<string, CompiledFn>(DEFAULT_MESSAGE_CACHE_SIZE)

/**
 * Clear the compiled-message LRU cache.
 *
 * Useful for long-running Node.js servers to reclaim memory.
 */
export function clearInterpolationCache(): void {
  compiledCache.clear()
}

/**
 * Resize the compiled-message LRU cache.
 * Clears existing entries when the size changes.
 *
 * @param maxSize - New maximum number of cached compiled messages
 */
export function setMessageCacheSize(maxSize: number): void {
  compiledCache = new LRUCache<string, CompiledFn>(maxSize)
}

/**
 * Parse, compile, and execute an ICU message with the given values and locale.
 *
 * @internal Low-level API — most users should use `createFluent()` instead.
 *
 * Compiled messages are cached in an LRU cache (500 entries max) keyed
 * by `locale:message` for fast repeated lookups.
 *
 * @param message - ICU MessageFormat string
 * @param values - Interpolation values
 * @param locale - BCP 47 locale string (defaults to 'en')
 * @param formatters - Optional custom ICU function formatters
 * @returns Interpolated string
 */
export function interpolate(
  message: string,
  values?: Record<string, unknown>,
  locale?: Locale,
  formatters?: Record<string, CustomFormatter>,
): string {
  const effectiveLocale = locale ?? 'en'

  // When custom formatters are provided, skip the shared cache since
  // different createFluentiCore instances may register different formatters.
  if (formatters) {
    const ast = parse(message)
    const compiled = compile(ast, effectiveLocale, formatters)
    if (typeof compiled === 'string') return compiled
    return compiled(values)
  }

  const cacheKey = `${effectiveLocale}\x00${message}`

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
