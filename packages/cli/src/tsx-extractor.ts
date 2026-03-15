import type { ExtractedMessage } from '@fluenti/core'
import { hashMessage } from './hash'

/**
 * Strategy B variable naming for tagged templates:
 * - Simple identifier: ${name} -> {name}
 * - Property access: ${user.name} -> {name} (last segment)
 * - Complex expression: ${getName()} -> {0} (positional)
 */
function classifyExpression(expr: string): string {
  const trimmed = expr.trim()
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
    return trimmed
  }
  if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(trimmed) && !trimmed.endsWith('.')) {
    const parts = trimmed.split('.')
    return parts[parts.length - 1]!
  }
  return ''
}

function buildICUFromTaggedTemplate(
  strings: readonly string[],
  expressions: readonly string[],
): string {
  let result = ''
  let positionalIndex = 0
  for (let i = 0; i < strings.length; i++) {
    result += strings[i]!
    if (i < expressions.length) {
      const name = classifyExpression(expressions[i]!)
      if (name === '') {
        result += `{${positionalIndex}}`
        positionalIndex++
      } else {
        result += `{${name}}`
      }
    }
  }
  return result
}

interface TaggedTemplateMatch {
  message: string
  line: number
  column: number
}

function extractTaggedTemplates(code: string): TaggedTemplateMatch[] {
  const results: TaggedTemplateMatch[] = []
  const regex = /\bt`((?:[^`\\]|\\.|(\$\{(?:[^}]|\{[^}]*\})*\}))*)`/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(code)) !== null) {
    const fullContent = match[1]!
    const offset = match.index
    const line = code.slice(0, offset).split('\n').length
    const lastNewline = code.lastIndexOf('\n', offset)
    const column = offset - lastNewline

    const expressions: string[] = []
    const strings: string[] = []
    let current = ''
    let i = 0

    while (i < fullContent.length) {
      if (fullContent[i] === '\\' && i + 1 < fullContent.length) {
        current += fullContent[i + 1]
        i += 2
      } else if (fullContent[i] === '$' && fullContent[i + 1] === '{') {
        strings.push(current)
        current = ''
        i += 2
        let depth = 1
        let expr = ''
        while (i < fullContent.length && depth > 0) {
          if (fullContent[i] === '{') depth++
          else if (fullContent[i] === '}') {
            depth--
            if (depth === 0) break
          }
          expr += fullContent[i]
          i++
        }
        expressions.push(expr)
        i++ // skip closing }
      } else {
        current += fullContent[i]
        i++
      }
    }
    strings.push(current)

    const message = buildICUFromTaggedTemplate(strings, expressions)
    results.push({ message, line, column })
  }

  return results
}

interface FunctionCallMatch {
  message: string
  line: number
  column: number
}

function extractFunctionCalls(code: string): FunctionCallMatch[] {
  const results: FunctionCallMatch[] = []
  const regex = /\bt\(\s*(['"])((?:[^\\]|\\.)*?)\1/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(code)) !== null) {
    const message = match[2]!.replace(/\\(['"])/g, '$1')
    const offset = match.index
    const line = code.slice(0, offset).split('\n').length
    const lastNewline = code.lastIndexOf('\n', offset)
    const column = offset - lastNewline

    results.push({ message, line, column })
  }

  return results
}

interface ComponentMatch {
  tag: 'Trans' | 'Plural'
  props: Record<string, string>
  line: number
  column: number
}

interface TransChildrenMatch {
  tag: 'Trans'
  childrenText: string
  line: number
  column: number
}

function extractTransWithChildren(code: string): TransChildrenMatch[] {
  const results: TransChildrenMatch[] = []

  // Match <Trans>...children...</Trans> (no message prop)
  const transChildrenRegex = /<Trans(?:\s[^>]*)?>(?!\s*$)([\s\S]*?)<\/Trans>/g
  let match: RegExpExecArray | null

  while ((match = transChildrenRegex.exec(code)) !== null) {
    const fullMatch = match[0]
    // Skip if it has a message prop (old API) or id prop (handled by extractComponents)
    if (/\bmessage\s*=/.test(fullMatch)) continue
    if (/\bid\s*=/.test(fullMatch)) continue

    const childrenContent = match[1]!.trim()
    if (!childrenContent) continue

    const offset = match.index
    const line = code.slice(0, offset).split('\n').length
    const lastNewline = code.lastIndexOf('\n', offset)
    const column = offset - lastNewline

    // Extract rich text: convert child elements to <0>content</0> pattern
    const childElementRegex = /<(\w+)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g
    let richMessage = childrenContent
    if (childElementRegex.test(childrenContent)) {
      let elemIdx = 0
      childElementRegex.lastIndex = 0
      richMessage = childrenContent.replace(/<(\w+)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g,
        (_m, _childTag: string, _childAttrStr: string, innerContent: string) => {
          const idx = elemIdx++
          return `<${idx}>${innerContent}</${idx}>`
        },
      )
    }

    results.push({ tag: 'Trans', childrenText: richMessage, line, column })
  }

  return results
}

function extractComponents(code: string): ComponentMatch[] {
  const results: ComponentMatch[] = []

  const transRegex = /<Trans\s+([^>]*?)\/?>(?:[\s\S]*?<\/Trans>)?/g
  let match: RegExpExecArray | null

  while ((match = transRegex.exec(code)) !== null) {
    const propsStr = match[1]!
    const props = parseProps(propsStr)
    const offset = match.index
    const line = code.slice(0, offset).split('\n').length
    const lastNewline = code.lastIndexOf('\n', offset)
    const column = offset - lastNewline
    results.push({ tag: 'Trans', props, line, column })
  }

  const pluralRegex = /<Plural\s+([^>]*?)\/?>(?:[\s\S]*?<\/Plural>)?/g

  while ((match = pluralRegex.exec(code)) !== null) {
    const propsStr = match[1]!
    const props = parseProps(propsStr)
    const offset = match.index
    const line = code.slice(0, offset).split('\n').length
    const lastNewline = code.lastIndexOf('\n', offset)
    const column = offset - lastNewline
    results.push({ tag: 'Plural', props, line, column })
  }

  return results
}

function parseProps(propsStr: string): Record<string, string> {
  const props: Record<string, string> = {}
  const propRegex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g
  let match: RegExpExecArray | null

  while ((match = propRegex.exec(propsStr)) !== null) {
    const name = match[1]!
    const value = match[2] ?? match[3] ?? match[4] ?? ''
    props[name] = value
  }

  return props
}

function buildPluralICU(props: Record<string, string>): string {
  // Support both count="var" and value={expr} props
  const countVar = props['value'] ?? props['count'] ?? 'count'
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

/** Extract messages from TSX/JSX files */
export function extractFromTsx(code: string, filename: string): ExtractedMessage[] {
  const messages: ExtractedMessage[] = []

  for (const tt of extractTaggedTemplates(code)) {
    const id = hashMessage(tt.message)
    messages.push({
      id,
      message: tt.message,
      origin: { file: filename, line: tt.line, column: tt.column },
    })
  }

  for (const fc of extractFunctionCalls(code)) {
    const id = hashMessage(fc.message)
    messages.push({
      id,
      message: fc.message,
      origin: { file: filename, line: fc.line, column: fc.column },
    })
  }

  for (const comp of extractComponents(code)) {
    if (comp.tag === 'Trans') {
      const message = comp.props['message']
      if (message) {
        const id = comp.props['id'] ?? hashMessage(message)
        messages.push({
          id,
          message,
          origin: { file: filename, line: comp.line, column: comp.column },
        })
      }
    } else {
      const pluralMessage = buildPluralICU(comp.props)
      if (pluralMessage) {
        const id = comp.props['id'] ?? hashMessage(pluralMessage)
        messages.push({
          id,
          message: pluralMessage,
          origin: { file: filename, line: comp.line, column: comp.column },
        })
      }
    }
  }

  // Extract <Trans>children text</Trans> (without message prop)
  for (const trans of extractTransWithChildren(code)) {
    const id = hashMessage(trans.childrenText)
    messages.push({
      id,
      message: trans.childrenText,
      origin: { file: filename, line: trans.line, column: trans.column },
    })
  }

  return messages
}
