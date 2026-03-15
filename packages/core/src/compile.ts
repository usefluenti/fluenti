import type { ASTNode, CompiledMessage, FunctionNode, Locale, PluralNode, SelectNode } from './types'
import { resolvePluralCategory } from './plural'

/**
 * Compile an AST into a CompiledMessage.
 *
 * - Single TextNode with no variables returns a plain string (zero overhead).
 * - Otherwise returns a function `(values?) => string`.
 * - Plural nodes use `Intl.PluralRules` with exact matches checked first.
 * - `#` inside plural branches is substituted with the numeric value (minus offset).
 */
export function compile(ast: ASTNode[], locale?: Locale): CompiledMessage {
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
    return renderNodes(ast, values ?? {}, effectiveLocale, undefined)
  }
}

function renderNodes(
  nodes: ASTNode[],
  values: Record<string, unknown>,
  locale: string,
  pluralValue: number | undefined,
): string {
  let result = ''
  for (const node of nodes) {
    result += renderNode(node, values, locale, pluralValue)
  }
  return result
}

function renderNode(
  node: ASTNode,
  values: Record<string, unknown>,
  locale: string,
  pluralValue: number | undefined,
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
      return renderPlural(node, values, locale)

    case 'select':
      return renderSelect(node, values, locale, pluralValue)

    case 'function':
      return renderFunction(node, values, locale)
  }
}

function renderPlural(
  node: PluralNode,
  values: Record<string, unknown>,
  locale: string,
): string {
  const raw = values[node.variable]
  const count = typeof raw === 'number' ? raw : Number(raw)
  const offset = node.offset ?? 0
  const adjustedCount = count - offset

  // Exact matches use raw count, CLDR categories use adjusted count
  const exactKey = `=${count}`
  let key: string
  if (exactKey in node.options) {
    key = exactKey
  } else {
    // Build options without exact matches for CLDR resolution
    key = resolvePluralCategory(adjustedCount, node.options, locale)
  }
  const branch = node.options[key] ?? node.options['other'] ?? []

  return renderNodes(branch, values, locale, adjustedCount)
}

function renderSelect(
  node: SelectNode,
  values: Record<string, unknown>,
  locale: string,
  pluralValue: number | undefined,
): string {
  const val = String(values[node.variable] ?? '')
  const branch = node.options[val] ?? node.options['other'] ?? []

  return renderNodes(branch, values, locale, pluralValue)
}

function renderFunction(
  node: FunctionNode,
  values: Record<string, unknown>,
  locale: string,
): string {
  const val = values[node.variable]

  switch (node.fn) {
    case 'number': {
      const num = typeof val === 'number' ? val : Number(val)
      if (node.style === 'currency') {
        return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(num)
      }
      if (node.style === 'percent') {
        return new Intl.NumberFormat(locale, { style: 'percent' }).format(num)
      }
      if (node.style) {
        return new Intl.NumberFormat(locale, {}).format(num)
      }
      return new Intl.NumberFormat(locale).format(num)
    }

    case 'date': {
      const date = val instanceof Date ? val : new Date(val as number)
      if (node.style === 'short') {
        return new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(date)
      }
      if (node.style === 'long') {
        return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)
      }
      if (node.style === 'full') {
        return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date)
      }
      return new Intl.DateTimeFormat(locale).format(date)
    }

    case 'time': {
      const date = val instanceof Date ? val : new Date(val as number)
      if (node.style === 'short') {
        return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(date)
      }
      if (node.style === 'long') {
        return new Intl.DateTimeFormat(locale, { timeStyle: 'long' }).format(date)
      }
      return new Intl.DateTimeFormat(locale, { timeStyle: 'medium' }).format(date)
    }

    default:
      return String(val ?? '')
  }
}
