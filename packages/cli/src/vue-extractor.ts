import type { ExtractedMessage } from '@fluenti/core'
import { parse as parseSFC } from '@vue/compiler-sfc'
import { hashMessage } from '@fluenti/core'
import { extractFromTsx } from './tsx-extractor'

// Vue template AST node types
const ELEMENT_NODE = 1
const TEXT_NODE = 2
const DIRECTIVE_PROP = 7
const ATTRIBUTE_PROP = 6

interface LocInfo {
  line: number
  column: number
  offset: number
}

interface SourceLoc {
  start: LocInfo
  end: LocInfo
  source: string
}

interface TemplateNode {
  type: number
  tag?: string
  tagType?: number
  props?: TemplateProp[]
  children?: TemplateNode[]
  content?: string
  loc: SourceLoc
}

interface TemplateProp {
  type: number
  name: string | { content: string }
  rawName?: string
  arg?: { content: string; isStatic: boolean }
  exp?: { content: string }
  modifiers?: Array<{ content: string } | string>
  value?: { content: string }
  nameLoc?: SourceLoc
  loc: SourceLoc
}

function getTextContent(children: TemplateNode[]): string {
  return children
    .filter((c) => c.type === TEXT_NODE)
    .map((c) => (c.content ?? '').trim())
    .join('')
}

function buildPluralICUFromPipe(text: string, countVar: string): string {
  const forms = text.split('|').map((s) => s.trim())
  const categories = ['one', 'other', 'zero', 'few', 'many']
  const options: string[] = []

  if (forms.length === 2) {
    options.push(`one {${forms[0]}}`)
    options.push(`other {${forms[1]}}`)
  } else {
    for (let i = 0; i < forms.length && i < categories.length; i++) {
      options.push(`${categories[i]} {${forms[i]}}`)
    }
  }

  return `{${countVar}, plural, ${options.join(' ')}}`
}

function buildPluralICUFromProps(props: Record<string, string>): string {
  const countVar = props['count'] ?? 'count'
  const categories = ['zero', 'one', 'two', 'few', 'many', 'other']
  const options: string[] = []

  for (const cat of categories) {
    if (props[cat] !== undefined) {
      options.push(`${cat} {${props[cat]}}`)
    }
  }

  if (options.length === 0) return ''
  return `{${countVar}, plural, ${options.join(' ')}}`
}

function walkTemplate(
  node: TemplateNode,
  filename: string,
  messages: ExtractedMessage[],
): void {
  if (node.type === ELEMENT_NODE) {
    const vtDirective = node.props?.find(
      (p) => p.type === DIRECTIVE_PROP && getPropName(p) === 't',
    )

    if (vtDirective) {
      const RESERVED_MODIFIERS = new Set(['plural'])
      const modifiers = (vtDirective.modifiers ?? []).map(
        (m: string | { content: string }) => (typeof m === 'string' ? m : m.content),
      )
      const isPlural = modifiers.includes('plural')
      // Reconstruct dotted ID: v-t:checkout.title → arg="checkout", modifier="title" → "checkout.title"
      // Non-reserved modifiers are treated as ID path segments
      const idSegments = modifiers.filter((m: string) => !RESERVED_MODIFIERS.has(m))
      const argContent = vtDirective.arg?.content
      const explicitId = argContent
        ? [argContent, ...idSegments].join('.')
        : undefined
      const textContent = getTextContent(node.children ?? [])

      if (isPlural) {
        const countVar = vtDirective.exp?.content ?? 'count'
        const message = buildPluralICUFromPipe(textContent, countVar)
        const id = explicitId ?? hashMessage(message)
        messages.push({
          id,
          message,
          origin: {
            file: filename,
            line: vtDirective.loc.start.line,
            column: vtDirective.loc.start.column,
          },
        })
      } else if (textContent) {
        const id = explicitId ?? hashMessage(textContent)
        messages.push({
          id,
          message: textContent,
          origin: {
            file: filename,
            line: vtDirective.loc.start.line,
            column: vtDirective.loc.start.column,
          },
        })
      }
    }

    if (node.tag === 'Trans') {
      const messageProp = node.props?.find(
        (p) => p.type === ATTRIBUTE_PROP && getPropName(p) === 'message',
      )
      const idProp = node.props?.find(
        (p) => p.type === ATTRIBUTE_PROP && getPropName(p) === 'id',
      )

      if (messageProp?.value) {
        // Old API: <Trans message="..." />
        const message = messageProp.value.content
        const id = idProp?.value?.content ?? hashMessage(message)
        messages.push({
          id,
          message,
          origin: {
            file: filename,
            line: node.loc.start.line,
            column: node.loc.start.column,
          },
        })
      } else if (node.children && node.children.length > 0) {
        // New API: <Trans>content with <a>rich text</a></Trans>
        const richText = extractRichTextFromTemplateChildren(node.children)
        if (richText.message) {
          const id = idProp?.value?.content ?? hashMessage(richText.message)
          messages.push({
            id,
            message: richText.message,
            origin: {
              file: filename,
              line: node.loc.start.line,
              column: node.loc.start.column,
            },
          })
        }
      }
    }

    if (node.tag === 'Plural') {
      const propsMap: Record<string, string> = {}
      let valueExpr: string | undefined
      for (const prop of node.props ?? []) {
        if (prop.type === ATTRIBUTE_PROP && prop.value) {
          propsMap[getPropName(prop)] = prop.value.content
        }
        // Handle :value="expr" binding (directive prop)
        if (prop.type === DIRECTIVE_PROP && getPropName(prop) === 'bind' && prop.arg?.content === 'value' && prop.exp) {
          valueExpr = prop.exp.content
        }
      }

      // Use :value binding expression as count variable, fall back to 'count' static prop
      const countVar = valueExpr ?? propsMap['count'] ?? 'count'
      const pluralMessage = buildPluralICUFromProps({ ...propsMap, count: countVar })
      if (pluralMessage) {
        const id = propsMap['id'] ?? hashMessage(pluralMessage)
        messages.push({
          id,
          message: pluralMessage,
          origin: {
            file: filename,
            line: node.loc.start.line,
            column: node.loc.start.column,
          },
        })
      }
    }
  }

  if (node.children) {
    for (const child of node.children) {
      walkTemplate(child, filename, messages)
    }
  }
}

function extractRichTextFromTemplateChildren(
  children: TemplateNode[],
): { message: string; hasElements: boolean } {
  let elementIndex = 0
  let hasElements = false

  const parts = children.map((child) => {
    if (child.type === TEXT_NODE) {
      return (child.content ?? '').trim() ? child.content ?? '' : ''
    }
    if (child.type === ELEMENT_NODE && child.tag) {
      hasElements = true
      const idx = elementIndex++
      const innerText = extractRichTextFromTemplateChildren(child.children ?? []).message
      return `<${idx}>${innerText}</${idx}>`
    }
    return ''
  })

  return {
    message: parts.join('').trim(),
    hasElements,
  }
}

function getPropName(prop: TemplateProp): string {
  if (typeof prop.name === 'string') return prop.name
  return prop.name.content
}

/** Extract messages from Vue SFC files */
export function extractFromVue(code: string, filename: string): ExtractedMessage[] {
  const messages: ExtractedMessage[] = []

  const { descriptor } = parseSFC(code, { filename })

  if (descriptor.template?.ast) {
    walkTemplate(descriptor.template.ast as unknown as TemplateNode, filename, messages)
  }

  // Also extract t() function calls from raw template source
  // (picks up t('source text') in template expressions like {{ t('...') }})
  if (descriptor.template?.content) {
    const templateMessages = extractFromTsx(descriptor.template.content, filename)
    const templateLoc = descriptor.template.loc
    const lineOffset = templateLoc.start.line - 1
    const existingIds = new Set(messages.map((m) => m.id))
    for (const msg of templateMessages) {
      if (!existingIds.has(msg.id)) {
        messages.push({
          ...msg,
          origin: {
            ...msg.origin,
            line: msg.origin.line + lineOffset,
          },
        })
      }
    }
  }

  if (descriptor.scriptSetup?.content) {
    const scriptMessages = extractFromTsx(descriptor.scriptSetup.content, filename)
    const scriptLoc = descriptor.scriptSetup.loc
    const lineOffset = scriptLoc.start.line - 1
    for (const msg of scriptMessages) {
      messages.push({
        ...msg,
        origin: {
          ...msg.origin,
          line: msg.origin.line + lineOffset,
        },
      })
    }
  }

  if (descriptor.script?.content) {
    const scriptMessages = extractFromTsx(descriptor.script.content, filename)
    const scriptLoc = descriptor.script.loc
    const lineOffset = scriptLoc.start.line - 1
    for (const msg of scriptMessages) {
      messages.push({
        ...msg,
        origin: {
          ...msg.origin,
          line: msg.origin.line + lineOffset,
        },
      })
    }
  }

  return messages
}
