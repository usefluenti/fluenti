import type { JSX } from 'solid-js'

function isNodeLike(value: unknown): value is Node {
  return typeof Node !== 'undefined' && value instanceof Node
}

function resolveValue(value: unknown): unknown {
  if (typeof value === 'function' && !(value as { length?: number }).length) {
    return (value as () => unknown)()
  }
  return value
}

export function offsetIndices(message: string, offset: number): string {
  if (offset === 0) return message
  return message
    .replace(/<(\d+)(\/?>)/g, (_match, index: string, suffix: string) => `<${Number(index) + offset}${suffix}`)
    .replace(/<\/(\d+)>/g, (_match, index: string) => `</${Number(index) + offset}>`)
}

export function extractMessage(value: unknown): {
  message: string
  components: Node[]
} {
  const components: Node[] = []
  let message = ''

  function visit(node: unknown): void {
    const resolved = resolveValue(node)
    if (resolved === null || resolved === undefined || typeof resolved === 'boolean') return
    if (Array.isArray(resolved)) {
      for (const child of resolved) visit(child)
      return
    }
    if (typeof resolved === 'string' || typeof resolved === 'number') {
      message += String(resolved)
      return
    }
    if (!isNodeLike(resolved)) return
    if (resolved.nodeType === Node.TEXT_NODE) {
      message += resolved.textContent ?? ''
      return
    }
    if (resolved.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      visit(Array.from(resolved.childNodes))
      return
    }

    const idx = components.length
    const inner = extractMessage(Array.from(resolved.childNodes))
    components.push((resolved as Element).cloneNode(false))
    components.push(...inner.components)
    message += `<${idx}>${offsetIndices(inner.message, idx + 1)}</${idx}>`
  }

  visit(value)
  return { message, components }
}

function appendChild(parent: Node, child: unknown): void {
  const resolved = resolveValue(child)
  if (resolved === null || resolved === undefined || typeof resolved === 'boolean') return
  if (Array.isArray(resolved)) {
    for (const entry of resolved) appendChild(parent, entry)
    return
  }
  if (typeof resolved === 'string' || typeof resolved === 'number') {
    parent.appendChild(document.createTextNode(String(resolved)))
    return
  }
  if (isNodeLike(resolved)) {
    parent.appendChild(resolved)
  }
}

export function reconstruct(
  translated: string,
  components: Node[],
): JSX.Element {
  const tagRe = /<(\d+)>([\s\S]*?)<\/\1>/g
  const result: unknown[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  tagRe.lastIndex = 0
  match = tagRe.exec(translated)
  while (match !== null) {
    if (match.index > lastIndex) {
      result.push(translated.slice(lastIndex, match.index))
    }

    const idx = Number(match[1])
    const template = components[idx]
    const inner = reconstruct(match[2]!, components)
    if (template) {
      const clone = template.cloneNode(false)
      appendChild(clone, inner)
      result.push(clone)
    } else {
      result.push(match[2]!)
    }

    lastIndex = tagRe.lastIndex
    match = tagRe.exec(translated)
  }

  if (lastIndex < translated.length) {
    result.push(translated.slice(lastIndex))
  }

  return (result.length <= 1 ? result[0] ?? '' : result) as JSX.Element
}

export function serializeRichForms<T extends string>(
  keys: readonly T[],
  forms: Partial<Record<T, unknown>> & Record<string, unknown>,
): {
  messages: Record<string, string>
  components: Node[]
} {
  const messages: Record<string, string> = {}
  const components: Node[] = []

  for (const key of keys) {
    const value = forms[key]
    if (value === undefined) continue
    const extracted = extractMessage(value)
    messages[key] = offsetIndices(extracted.message, components.length)
    components.push(...extracted.components)
  }

  for (const [key, value] of Object.entries(forms)) {
    if (keys.includes(key as T) || value === undefined) continue
    const extracted = extractMessage(value)
    messages[key] = offsetIndices(extracted.message, components.length)
    components.push(...extracted.components)
  }

  return { messages, components }
}

export function buildICUSelectMessage(forms: Record<string, string>): string {
  return `{value, select, ${Object.entries(forms).map(([key, text]) => `${key} {${text}}`).join(' ')}}`
}

export function normalizeSelectForms(forms: Record<string, string>): {
  forms: Record<string, string>
  valueMap: Record<string, string>
} {
  const normalized: Record<string, string> = {}
  const valueMap: Record<string, string> = {}
  let index = 0

  for (const [key, text] of Object.entries(forms)) {
    if (key === 'other') {
      normalized['other'] = text
      continue
    }

    const safeKey = /^[A-Za-z0-9_]+$/.test(key) ? key : `case_${index++}`
    normalized[safeKey] = text
    valueMap[key] = safeKey
  }

  if (normalized['other'] === undefined) {
    normalized['other'] = ''
  }

  return { forms: normalized, valueMap }
}
