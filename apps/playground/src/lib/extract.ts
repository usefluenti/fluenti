/**
 * Browser-safe message extraction from Vue SFC and Solid TSX.
 * Mirrors @fluenti/cli extraction logic using regex-based approach.
 */

import { hashMessage } from '@fluenti/core'

export interface ExtractedMessage {
  readonly id: string
  readonly message: string
  readonly origin: { readonly file: string; readonly line: number; readonly column?: number }
}

// ─── Tagged template extraction: t`Hello ${name}` ────────────────────────────

function classifyExpression(expr: string): string {
  const trimmed = expr.trim()
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) return trimmed
  if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(trimmed) && !trimmed.endsWith('.')) {
    const parts = trimmed.split('.')
    return parts[parts.length - 1]!
  }
  return ''
}

function extractTaggedTemplates(code: string, filename: string): ExtractedMessage[] {
  const results: ExtractedMessage[] = []
  const regex = /\bt`((?:[^`\\]|\\.|(\$\{(?:[^}]|\{[^}]*\})*\}))*)`/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(code)) !== null) {
    const fullContent = match[1]!
    const offset = match.index
    const line = code.slice(0, offset).split('\n').length

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
        i++
      } else {
        current += fullContent[i]
        i++
      }
    }
    strings.push(current)

    let message = ''
    let positionalIndex = 0
    for (let j = 0; j < strings.length; j++) {
      message += strings[j]!
      if (j < expressions.length) {
        const name = classifyExpression(expressions[j]!)
        message += name === '' ? `{${positionalIndex++}}` : `{${name}}`
      }
    }

    results.push({ id: hashMessage(message), message, origin: { file: filename, line } })
  }

  return results
}

// ─── Function call extraction: t('Hello {name}') ────────────────────────────

function extractFunctionCalls(code: string, filename: string): ExtractedMessage[] {
  const results: ExtractedMessage[] = []
  const regex = /\bt\(\s*(['"])((?:[^\\]|\\.)*?)\1/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(code)) !== null) {
    const message = match[2]!.replace(/\\(['"])/g, '$1')
    const line = code.slice(0, match.index).split('\n').length
    results.push({ id: hashMessage(message), message, origin: { file: filename, line } })
  }

  return results
}

// ─── Component extraction: <Trans>, <Plural> ────────────────────────────────

function parseProps(propsStr: string): Record<string, string> {
  const props: Record<string, string> = {}
  const propRegex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g
  let match: RegExpExecArray | null
  while ((match = propRegex.exec(propsStr)) !== null) {
    props[match[1]!] = match[2] ?? match[3] ?? match[4] ?? ''
  }
  return props
}

function buildPluralICU(props: Record<string, string>): string {
  const countVar = props['value'] ?? props['count'] ?? 'count'
  const categories = ['zero', 'one', 'two', 'few', 'many', 'other'] as const
  const options: string[] = []
  for (const cat of categories) {
    if (props[cat] !== undefined) {
      options.push(`${cat} {${props[cat]}}`)
    }
  }
  if (options.length === 0) return ''
  return `{${countVar}, plural, ${options.join(' ')}}`
}

function extractComponents(code: string, filename: string): ExtractedMessage[] {
  const results: ExtractedMessage[] = []

  // <Trans message="..." /> (old API)
  const transRegex = /<Trans\s+([^>]*?)\/?>(?:[\s\S]*?<\/Trans>)?/g
  let match: RegExpExecArray | null
  while ((match = transRegex.exec(code)) !== null) {
    const props = parseProps(match[1]!)
    if (props['message']) {
      const id = props['id'] ?? hashMessage(props['message'])
      const line = code.slice(0, match.index).split('\n').length
      results.push({ id, message: props['message'], origin: { file: filename, line } })
    }
  }

  // <Trans>children</Trans> (new API)
  const transChildrenRegex = /<Trans(?:\s[^>]*)?>(?!\s*$)([\s\S]*?)<\/Trans>/g
  while ((match = transChildrenRegex.exec(code)) !== null) {
    if (/\bmessage\s*=/.test(match[0]) || /\bid\s*=/.test(match[0])) continue
    const content = match[1]!.trim()
    if (!content) continue

    let richMessage = content
    const childElementRegex = /<(\w+)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g
    if (childElementRegex.test(content)) {
      let elemIdx = 0
      childElementRegex.lastIndex = 0
      richMessage = content.replace(/<(\w+)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g,
        (_m, _tag: string, _attrs: string, inner: string) => {
          const idx = elemIdx++
          return `<${idx}>${inner}</${idx}>`
        },
      )
    }

    const line = code.slice(0, match.index).split('\n').length
    results.push({ id: hashMessage(richMessage), message: richMessage, origin: { file: filename, line } })
  }

  // <Plural :value="expr" one="..." other="..." />
  const pluralRegex = /<Plural\s+([^>]*?)\/?>(?:[\s\S]*?<\/Plural>)?/g
  while ((match = pluralRegex.exec(code)) !== null) {
    const props = parseProps(match[1]!)
    const pluralMessage = buildPluralICU(props)
    if (pluralMessage) {
      const id = props['id'] ?? hashMessage(pluralMessage)
      const line = code.slice(0, match.index).split('\n').length
      results.push({ id, message: pluralMessage, origin: { file: filename, line } })
    }
  }

  return results
}

// ─── v-t directive extraction (regex-based, for Vue SFC templates) ──────────

function extractVtDirectives(template: string, filename: string, lineOffset: number): ExtractedMessage[] {
  const results: ExtractedMessage[] = []

  // v-t.attr (attribute translation)
  const vtAttrRegex = /<\w+\s[^>]*?\bv-t\.(\w+)\b[^>]*>/g
  let match: RegExpExecArray | null
  while ((match = vtAttrRegex.exec(template)) !== null) {
    const attrName = match[1]!
    if (attrName === 'plural') continue
    const allAttrs = match[0]
    const attrRegex = new RegExp(`\\b${attrName}="([^"]*)"`)
    const attrMatch = allAttrs.match(attrRegex)
    if (attrMatch) {
      const message = attrMatch[1]!
      const line = template.slice(0, match.index).split('\n').length + lineOffset
      results.push({ id: hashMessage(message), message, origin: { file: filename, line } })
    }
  }

  // v-t on content: <tag v-t>text</tag> or <tag v-t:id>text</tag>
  const vtContentRegex = /<(\w+)(\s[^>]*?)\bv-t(?::([a-zA-Z0-9_.]+))?(?:\.plural)?(?:="([^"]*)")?\b([^>]*)>([\s\S]*?)<\/\1>/g
  while ((match = vtContentRegex.exec(template)) !== null) {
    const explicitId = match[3]
    const bindExpr = match[4]
    const content = match[6]!.trim()
    const isPlural = match[0].includes('v-t.plural')
    const line = template.slice(0, match.index).split('\n').length + lineOffset

    if (isPlural && bindExpr) {
      const forms = content.split('|').map((s: string) => s.trim())
      const categories = forms.length === 2
        ? ['one', 'other']
        : ['one', 'other', 'zero', 'few', 'many'].slice(0, forms.length)
      const icuParts = categories.map((cat, i) => `${cat} {${forms[i] ?? ''}}`)
      const message = `{${bindExpr}, plural, ${icuParts.join(' ')}}`
      const id = explicitId ?? hashMessage(message)
      results.push({ id, message, origin: { file: filename, line } })
    } else if (content) {
      const id = explicitId ?? hashMessage(content)
      results.push({ id, message: content, origin: { file: filename, line } })
    }
  }

  return results
}

// ─── Public API ─────────────────────────────────────────────────────────────

export type SourceLanguage = 'vue' | 'solid'

export function extractMessages(code: string, language: SourceLanguage): ExtractedMessage[] {
  const filename = language === 'vue' ? 'Playground.vue' : 'Playground.tsx'

  if (language === 'vue') {
    return extractFromVueSFC(code, filename)
  }
  return extractFromTsx(code, filename)
}

function extractFromVueSFC(code: string, filename: string): ExtractedMessage[] {
  const messages: ExtractedMessage[] = []

  // Extract template section
  const templateMatch = code.match(/<template(\s[^>]*)?>([\s\S]*?)<\/template>/)
  if (templateMatch) {
    const templateContent = templateMatch[2]!
    const templateLine = code.slice(0, templateMatch.index!).split('\n').length

    // v-t directives
    messages.push(...extractVtDirectives(templateContent, filename, templateLine - 1))
    // Components in template
    messages.push(...extractComponents(templateContent, filename))
    // t() calls in template expressions
    const tCalls = extractFunctionCalls(templateContent, filename)
    const existingIds = new Set(messages.map(m => m.id))
    for (const msg of tCalls) {
      if (!existingIds.has(msg.id)) {
        messages.push({
          ...msg,
          origin: { ...msg.origin, line: msg.origin.line + templateLine - 1 },
        })
      }
    }
  }

  // Extract script sections
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/g
  let scriptMatch: RegExpExecArray | null
  while ((scriptMatch = scriptRegex.exec(code)) !== null) {
    const scriptContent = scriptMatch[1]!
    const scriptLine = code.slice(0, scriptMatch.index).split('\n').length
    const scriptMessages = extractFromTsx(scriptContent, filename)
    for (const msg of scriptMessages) {
      messages.push({
        ...msg,
        origin: { ...msg.origin, line: msg.origin.line + scriptLine - 1 },
      })
    }
  }

  return messages
}

function extractFromTsx(code: string, filename: string): ExtractedMessage[] {
  return [
    ...extractTaggedTemplates(code, filename),
    ...extractFunctionCalls(code, filename),
    ...extractComponents(code, filename),
  ]
}
