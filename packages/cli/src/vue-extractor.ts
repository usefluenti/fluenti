import type { ExtractedMessage } from '@fluenti/core/compiler'
import { parse as parseSFC } from '@vue/compiler-sfc'
import { createMessageId } from '@fluenti/core/transform'
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

const SELECT_RESERVED_PROPS = new Set(['id', 'value', 'context', 'comment', 'options', 'other', 'tag'])

function buildSelectICUFromProps(varName: string, cases: Record<string, string>, other: string): string {
  const options: string[] = []
  for (const [key, value] of Object.entries(cases)) {
    options.push(`${key} {${value}}`)
  }
  options.push(`other {${other}}`)
  return `{${varName}, select, ${options.join(' ')}}`
}

function buildPluralICUFromProps(props: Record<string, string>): string {
  const countVar = props['count'] ?? 'count'
  const categories = ['zero', 'one', 'two', 'few', 'many', 'other']
  const options: string[] = []
  const offset = props['offset']

  for (const cat of categories) {
    if (props[cat] !== undefined) {
      const key = cat === 'zero' ? '=0' : cat
      options.push(`${key} {${props[cat]}}`)
    }
  }

  if (options.length === 0) return ''
  const offsetPrefix = offset ? `offset:${offset} ` : ''
  return `{${countVar}, plural, ${offsetPrefix}${options.join(' ')}}`
}

function walkTemplate(
  node: TemplateNode,
  filename: string,
  messages: ExtractedMessage[],
  idGenerator?: (message: string, context?: string) => string,
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
        const id = explicitId ?? (idGenerator ?? createMessageId)(message)
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
        const id = explicitId ?? (idGenerator ?? createMessageId)(textContent)
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
      const contextProp = node.props?.find(
        (p) => p.type === ATTRIBUTE_PROP && getPropName(p) === 'context',
      )
      const commentProp = node.props?.find(
        (p) => p.type === ATTRIBUTE_PROP && getPropName(p) === 'comment',
      )
      const context = contextProp?.value?.content
      const comment = commentProp?.value?.content

      if (messageProp?.value) {
        // Old API: <Trans message="..." />
        const message = messageProp.value.content
        const generateId = idGenerator ?? createMessageId
        const id = idProp?.value?.content ?? generateId(message, context)
        messages.push({
          id,
          message,
          ...(context !== undefined ? { context } : {}),
          ...(comment !== undefined ? { comment } : {}),
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
          const generateId = idGenerator ?? createMessageId
          const id = idProp?.value?.content ?? generateId(richText.message, context)
          messages.push({
            id,
            message: richText.message,
            ...(context !== undefined ? { context } : {}),
            ...(comment !== undefined ? { comment } : {}),
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
      let offsetExpr: string | undefined
      for (const prop of node.props ?? []) {
        if (prop.type === ATTRIBUTE_PROP && prop.value) {
          propsMap[getPropName(prop)] = prop.value.content
        }
        // Handle :value="expr" binding (directive prop)
        if (prop.type === DIRECTIVE_PROP && getPropName(prop) === 'bind' && prop.arg?.content === 'value' && prop.exp) {
          valueExpr = prop.exp.content
        }
        if (prop.type === DIRECTIVE_PROP && getPropName(prop) === 'bind' && prop.arg?.content === 'offset' && prop.exp) {
          offsetExpr = prop.exp.content
        }
      }

      // Use :value binding expression as count variable, fall back to 'count' static prop
      const countVar = valueExpr ?? propsMap['count'] ?? 'count'
      const offset = offsetExpr ?? propsMap['offset']
      const pluralMessage = buildPluralICUFromProps({
        ...propsMap,
        count: countVar,
        ...(offset !== undefined ? { offset } : {}),
      })
      if (pluralMessage) {
        const id = propsMap['id'] ?? (idGenerator ?? createMessageId)(pluralMessage)
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

    if (node.tag === 'Select') {
      let varName: string | undefined
      let selectId: string | undefined
      let selectContext: string | undefined
      let selectComment: string | undefined
      let other: string | undefined
      const cases: Record<string, string> = {}

      for (const prop of node.props ?? []) {
        if (prop.type === ATTRIBUTE_PROP && prop.value) {
          const name = getPropName(prop)
          if (name === 'id') { selectId = prop.value.content; continue }
          if (name === 'context') { selectContext = prop.value.content; continue }
          if (name === 'comment') { selectComment = prop.value.content; continue }
          if (name === 'other') { other = prop.value.content; continue }
          if (SELECT_RESERVED_PROPS.has(name)) continue
          cases[name] = prop.value.content
        }
        if (prop.type === DIRECTIVE_PROP && getPropName(prop) === 'bind' && prop.arg?.content === 'value' && prop.exp) {
          varName = prop.exp.content
        }
      }

      if (varName && other && Object.keys(cases).length > 0) {
        const message = buildSelectICUFromProps(varName, cases, other)
        const generateId = idGenerator ?? createMessageId
        const id = selectId ?? generateId(message, selectContext)
        messages.push({
          id,
          message,
          ...(selectContext !== undefined ? { context: selectContext } : {}),
          ...(selectComment !== undefined ? { comment: selectComment } : {}),
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
      walkTemplate(child, filename, messages, idGenerator)
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

function extractTemplateInterpolations(
  content: string,
  filename: string,
  idGenerator?: (message: string, context?: string) => string,
): ExtractedMessage[] {
  const messages: ExtractedMessage[] = []
  const interpolationRegex = /\{\{([\s\S]*?)\}\}/g
  let match: RegExpExecArray | null

  while ((match = interpolationRegex.exec(content)) !== null) {
    const expression = match[1]?.trim()
    if (!expression) continue

    const extracted = extractFromTsx(expression, filename, idGenerator)
    if (extracted.length === 0) continue

    const lineOffset = content.slice(0, match.index).split('\n').length - 1
    for (const msg of extracted) {
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

/** Extract messages from Vue SFC files */
export function extractFromVue(
  code: string,
  filename: string,
  idGenerator?: (message: string, context?: string) => string,
): ExtractedMessage[] {
  const messages: ExtractedMessage[] = []

  const { descriptor } = parseSFC(code, { filename })

  if (descriptor.template?.ast) {
    walkTemplate(descriptor.template.ast as unknown as TemplateNode, filename, messages, idGenerator)
  }

  // Also extract t() function calls from raw template source
  // (picks up t('source text') in template expressions like {{ t('...') }})
  if (descriptor.template?.content) {
    const templateMessages = extractFromTsx(descriptor.template.content, filename, idGenerator)
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

    // Rebuild the set after template pass to include newly added IDs
    const afterTemplateIds = new Set(messages.map((m) => m.id))
    const interpolationMessages = extractTemplateInterpolations(descriptor.template.content, filename, idGenerator)
    for (const msg of interpolationMessages) {
      if (!afterTemplateIds.has(msg.id)) {
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
    const scriptMessages = extractFromTsx(descriptor.scriptSetup.content, filename, idGenerator)
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
    const scriptMessages = extractFromTsx(descriptor.script.content, filename, idGenerator)
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
