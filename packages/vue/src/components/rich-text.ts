import { Comment, Text, h, isVNode, type VNode, type VNodeChild } from 'vue'
import { offsetIndices } from '@fluenti/core'

export function extractMessage(children: VNodeChild | VNodeChild[] | undefined): {
  message: string
  components: VNode[]
} {
  const components: VNode[] = []
  let message = ''

  function visit(node: VNodeChild | VNodeChild[] | undefined): void {
    if (node === null || node === undefined || typeof node === 'boolean') return
    if (Array.isArray(node)) {
      for (const child of node) visit(child)
      return
    }
    if (typeof node === 'string' || typeof node === 'number') {
      message += String(node)
      return
    }
    if (!isVNode(node) || node.type === Comment) return
    if (node.type === Text) {
      message += typeof node.children === 'string' ? node.children : ''
      return
    }

    const idx = components.length
    const inner = extractMessage(node.children as VNodeChild | VNodeChild[] | undefined)
    components.push(node)
    components.push(...inner.components)
    message += `<${idx}>${offsetIndices(inner.message, idx + 1)}</${idx}>`
  }

  visit(children)
  return { message, components }
}

export function reconstruct(
  translated: string,
  components: VNode[],
): VNodeChild {
  const tagRe = /<(\d+)>([\s\S]*?)<\/\1>/g
  const result: VNodeChild[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  tagRe.lastIndex = 0
  match = tagRe.exec(translated)
  while (match !== null) {
    if (match.index > lastIndex) {
      result.push(translated.slice(lastIndex, match.index))
    }

    const idx = Number(match[1])
    const component = components[idx]
    const innerContent = reconstruct(match[2]!, components)
    if (component) {
      result.push(h(component.type as never, component.props ?? {}, Array.isArray(innerContent) ? innerContent : [innerContent]))
    } else {
      result.push(match[2]!)
    }

    lastIndex = tagRe.lastIndex
    match = tagRe.exec(translated)
  }

  if (lastIndex < translated.length) {
    result.push(translated.slice(lastIndex))
  }

  return result.length <= 1 ? (result[0] ?? '') : result
}

export function serializeRichForms<T extends string>(
  keys: readonly T[],
  forms: Partial<Record<T, VNodeChild>> & Record<string, VNodeChild | undefined>,
): {
  messages: Record<string, string>
  components: VNode[]
} {
  const messages: Record<string, string> = {}
  const components: VNode[] = []

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

