import type { ASTNode, CompiledMessage, CustomFormatter, FunctionNode, Locale, PluralNode, SelectNode } from './types'
import { resolvePluralCategory } from './plural'
import { LOCALE_CURRENCY_MAP } from './formatters/number'
import { LRUCache, stableCacheKey } from './lru'

const nfCache = new LRUCache<string, Intl.NumberFormat>(200)
const dtfCache = new LRUCache<string, Intl.DateTimeFormat>(200)

/**
 * Clear the internal Intl.NumberFormat and Intl.DateTimeFormat caches
 * used by the ICU compiler.
 *
 * Useful for long-running Node.js servers to reclaim memory.
 */
export function clearCompileCache(): void {
  nfCache.clear()
  dtfCache.clear()
}

function getCachedNumberFormat(locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = stableCacheKey(locale, options as Record<string, unknown>)
  let fmt = nfCache.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, options)
    nfCache.set(key, fmt)
  }
  return fmt
}

function getCachedDateTimeFormat(locale: string, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = stableCacheKey(locale, options as Record<string, unknown>)
  let fmt = dtfCache.get(key)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, options)
    dtfCache.set(key, fmt)
  }
  return fmt
}

/**
 * Compile an AST into a CompiledMessage.
 *
 * - Single TextNode with no variables returns a plain string (zero overhead).
 * - Otherwise returns a function `(values?) => string`.
 * - Plural nodes use `Intl.PluralRules` with exact matches checked first.
 * - `#` inside plural branches is substituted with the numeric value (minus offset).
 * @internal
 */
export function compile(
  ast: ASTNode[],
  locale?: Locale,
  formatters?: Record<string, CustomFormatter>,
): CompiledMessage {
  // Optimization: single text node returns string directly
  if (ast.length === 1 && ast[0]!.type === 'text') {
    return ast[0]!.value
  }

  // Check if AST is purely static (all text nodes)
  if (ast.every(node => node.type === 'text')) {
    return ast.map(node => (node as { value: string }).value).join('')
  }

  const effectiveLocale = locale ?? 'en'

  return (values?: Record<string, unknown>): string => {
    return renderNodes(ast, values ?? {}, effectiveLocale, undefined, formatters)
  }
}

function renderNodes(
  nodes: ASTNode[],
  values: Record<string, unknown>,
  locale: string,
  pluralValue: number | undefined,
  formatters?: Record<string, CustomFormatter>,
): string {
  let result = ''
  for (const node of nodes) {
    result += renderNode(node, values, locale, pluralValue, formatters)
  }
  return result
}

function renderNode(
  node: ASTNode,
  values: Record<string, unknown>,
  locale: string,
  pluralValue: number | undefined,
  formatters?: Record<string, CustomFormatter>,
): string {
  switch (node.type) {
    case 'text':
      return node.value

    case 'variable': {
      if (node.name === '#') {
        return pluralValue !== undefined ? String(pluralValue) : '#'
      }
      const val = values[node.name]
      return val !== undefined && val !== null ? String(val) : `{${node.name}}`
    }

    case 'plural':
      return renderPlural(node, values, locale, formatters)

    case 'select':
      return renderSelect(node, values, locale, pluralValue, formatters)

    case 'function':
      return renderFunction(node, values, locale, formatters)
  }
}

function renderPlural(
  node: PluralNode,
  values: Record<string, unknown>,
  locale: string,
  formatters?: Record<string, CustomFormatter>,
): string {
  const raw = values[node.variable]
  if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] !== 'production') {
    if (raw !== undefined && raw !== null && !Number.isFinite(Number(raw))) {
      console.warn(`[fluenti] Plural variable "${node.variable}" received non-numeric value: ${String(raw)}`)
    }
  }
  const count = typeof raw === 'number' ? raw : (Number(raw) || 0)
  const offset = node.offset ?? 0
  const adjustedCount = count - offset

  // Exact matches use raw count, CLDR categories use adjusted count
  const exactKey = `=${count}`
  let key: string
  if (exactKey in node.options) {
    key = exactKey
  } else {
    // Build options without exact matches for CLDR resolution
    key = resolvePluralCategory(adjustedCount, node.options, locale, node.ordinal)
  }
  const branch = node.options[key] ?? node.options['other'] ?? []

  // Exact-match branches (=N) render # as the raw count; CLDR categories use adjusted count.
  return renderNodes(branch, values, locale, exactKey in node.options ? count : adjustedCount, formatters)
}

function renderSelect(
  node: SelectNode,
  values: Record<string, unknown>,
  locale: string,
  pluralValue: number | undefined,
  formatters?: Record<string, CustomFormatter>,
): string {
  const val = String(values[node.variable] ?? '')
  const branch = node.options[val] ?? node.options['other'] ?? []

  return renderNodes(branch, values, locale, pluralValue, formatters)
}

function renderFunction(
  node: FunctionNode,
  values: Record<string, unknown>,
  locale: string,
  formatters?: Record<string, CustomFormatter>,
): string {
  const val = values[node.variable]
  if (val === undefined || val === null) {
    return `{${node.variable}}`
  }

  // Check custom formatters first
  const customFn = formatters?.[node.fn]
  if (customFn) {
    try {
      return String(customFn(val, node.style ?? '', locale))
    } catch (err) {
      if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] !== 'production') {
        console.warn(`[fluenti] Custom formatter "${node.fn}" threw for variable "${node.variable}":`, err)
      }
      return `{${node.variable}}`
    }
  }

  try {
    switch (node.fn) {
      case 'number': {
        const num = typeof val === 'number' ? val : Number(val)
        if (node.style === 'currency') {
          const currency = LOCALE_CURRENCY_MAP[locale] ?? LOCALE_CURRENCY_MAP[locale.split('-')[0]!] ?? 'USD'
          return getCachedNumberFormat(locale, { style: 'currency', currency }).format(num)
        }
        if (node.style === 'percent') {
          return getCachedNumberFormat(locale, { style: 'percent' }).format(num)
        }
        if (node.style) {
          return getCachedNumberFormat(locale, {}).format(num)
        }
        return getCachedNumberFormat(locale).format(num)
      }

      case 'date': {
        const date = val instanceof Date ? val : new Date(val as number)
        if (node.style === 'short') {
          return getCachedDateTimeFormat(locale, { dateStyle: 'short' }).format(date)
        }
        if (node.style === 'long') {
          return getCachedDateTimeFormat(locale, { dateStyle: 'long' }).format(date)
        }
        if (node.style === 'full') {
          return getCachedDateTimeFormat(locale, { dateStyle: 'full' }).format(date)
        }
        return getCachedDateTimeFormat(locale).format(date)
      }

      case 'time': {
        const date = val instanceof Date ? val : new Date(val as number)
        if (node.style === 'short') {
          return getCachedDateTimeFormat(locale, { timeStyle: 'short' }).format(date)
        }
        if (node.style === 'long') {
          return getCachedDateTimeFormat(locale, { timeStyle: 'long' }).format(date)
        }
        return getCachedDateTimeFormat(locale, { timeStyle: 'medium' }).format(date)
      }

      default:
        return String(val ?? '')
    }
  } catch (err) {
    if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] !== 'production') {
      console.warn(`[fluenti] Built-in formatter "${node.fn}" threw for variable "${node.variable}" (locale: "${locale}"):`, err)
    }
    return `{${node.variable}}`
  }
}
