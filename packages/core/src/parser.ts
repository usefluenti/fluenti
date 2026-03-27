import type { ASTNode, FunctionNode, PluralNode, SelectNode, TextNode, VariableNode } from './types'

const WS_REGEX = /\s/
const IDENT_REGEX = /[a-zA-Z0-9_]/
const DIGIT_REGEX = /[0-9]/
const MAX_NESTING_DEPTH = 10
const MAX_IDENTIFIER_LENGTH = 256
const MAX_MESSAGE_LENGTH = 100_000
const MAX_NODE_COUNT = 10_000

/**
 * Error thrown when parsing an ICU MessageFormat string fails.
 * Includes offset and source excerpt for Rust-style diagnostics.
 * @internal Low-level API — most users should use `createFluent()` instead.
 */
export class FluentParseError extends Error {
  constructor(
    message: string,
    public offset: number,
    public source: string,
  ) {
    const excerpt = source.length > 40
      ? source.slice(Math.max(0, offset - 15), offset + 25)
      : source
    const pointer = ' '.repeat(Math.min(offset, 15)) + '^'
    super(`${message} at offset ${offset}\n\n  ${excerpt}\n  ${pointer}\n`)
    this.name = 'FluentParseError'
  }
}

/**
 * Hand-written recursive descent ICU MessageFormat parser.
 *
 * Supports: text, variables `{name}`, plural, select, function calls,
 * nested messages, `#` inside plural, and `'` escaping.
 * @internal Low-level API — most users should use `createFluent()` instead.
 */
export function parse(message: string): ASTNode[] {
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new FluentParseError(
      `Message length ${message.length} exceeds maximum of ${MAX_MESSAGE_LENGTH}`,
      0,
      message.slice(0, 100), // truncate for error display
    )
  }

  let pos = 0
  const len = message.length
  let pluralDepth = 0
  let nodeCount = 0

  function trackNode(): void {
    if (++nodeCount > MAX_NODE_COUNT) {
      throw new FluentParseError(
        `Message exceeds maximum of ${MAX_NODE_COUNT} AST nodes`,
        pos,
        message.slice(0, 100),
      )
    }
  }

  function skipWhitespace(): void {
    while (pos < len && WS_REGEX.test(message[pos]!)) {
      pos++
    }
  }

  function advance(): string {
    return message[pos++]!
  }

  function readIdentifier(): string {
    const start = pos
    while (pos < len && IDENT_REGEX.test(message[pos]!)) {
      pos++
    }
    if (pos === start) {
      throw new FluentParseError('Expected identifier', pos, message)
    }
    if (pos - start > MAX_IDENTIFIER_LENGTH) {
      throw new FluentParseError(
        `Identifier exceeds maximum length of ${MAX_IDENTIFIER_LENGTH}`,
        start,
        message,
      )
    }
    return message.slice(start, pos)
  }

  function parseNodes(depth: number): ASTNode[] {
    if (depth > MAX_NESTING_DEPTH) {
      throw new FluentParseError(
        `Maximum nesting depth of ${MAX_NESTING_DEPTH} exceeded`,
        pos,
        message,
      )
    }
    const nodes: ASTNode[] = []
    let textStart = pos

    function flushText(end: number): void {
      if (end > textStart) {
        const value = message.slice(textStart, end)
        if (value.length > 0) {
          trackNode()
          nodes.push({ type: 'text', value } as TextNode)
        }
      }
    }

    while (pos < len) {
      const ch = message[pos]

      if (ch === '}' && depth > 0) {
        flushText(pos)
        return nodes
      }

      if (ch === '#' && pluralDepth > 0) {
        flushText(pos)
        trackNode()
        nodes.push({ type: 'variable', name: '#' } as VariableNode)
        pos++
        textStart = pos
        continue
      }

      if (ch === "'") {
        // ICU escaping: '' -> literal ', '{' -> literal {, '}' -> literal }
        if (pos + 1 < len && message[pos + 1] === "'") {
          flushText(pos)
          pos += 2
          trackNode()
          nodes.push({ type: 'text', value: "'" } as TextNode)
          textStart = pos
          continue
        }
        if (pos + 1 < len && (message[pos + 1] === '{' || message[pos + 1] === '}')) {
          flushText(pos)
          pos++ // skip quote
          const escaped = advance()
          // Check for closing quote
          if (pos < len && message[pos] === "'") {
            pos++
          }
          trackNode()
          nodes.push({ type: 'text', value: escaped } as TextNode)
          textStart = pos
          continue
        }
        // Lone apostrophe before non-special text — treat as literal (apostrophe-insensitive mode).
        // Contractions like "isn't {name}" must not swallow the {name} placeholder.
        pos++
        continue
      }

      if (ch === '{') {
        flushText(pos)
        pos++ // skip {
        skipWhitespace()

        // Read the variable name or number
        const name = readIdentifier()
        skipWhitespace()

        if (pos < len && message[pos] === '}') {
          // Simple variable: {name}
          pos++ // skip }
          trackNode()
          nodes.push({ type: 'variable', name } as VariableNode)
          textStart = pos
          continue
        }

        if (pos < len && message[pos] === ',') {
          pos++ // skip ,
          skipWhitespace()
          const keyword = readIdentifier()
          skipWhitespace()

          if (keyword === 'plural' || keyword === 'selectordinal') {
            if (pos < len && message[pos] === ',') {
              pos++ // skip ,
            }
            skipWhitespace()

            // Check for offset
            let offset: number | undefined
            if (message.slice(pos, pos + 7) === 'offset:') {
              pos += 7
              skipWhitespace()
              const offStart = pos
              while (pos < len && DIGIT_REGEX.test(message[pos]!)) {
                pos++
              }
              offset = parseInt(message.slice(offStart, pos), 10)
              skipWhitespace()
            }

            pluralDepth++
            const options = parsePluralOrSelectOptions(depth + 1)
            pluralDepth--

            if (!options['other']) {
              throw new FluentParseError(
                `Plural/selectordinal must have an 'other' option`,
                pos,
                message,
              )
            }

            const node: PluralNode = {
              type: 'plural',
              variable: name,
              options,
            }
            if (offset !== undefined) {
              node.offset = offset
            }
            if (keyword === 'selectordinal') {
              node.ordinal = true
            }
            trackNode()
            nodes.push(node)
            textStart = pos
            continue
          }

          if (keyword === 'select') {
            if (pos < len && message[pos] === ',') {
              pos++ // skip ,
            }
            skipWhitespace()

            const options = parsePluralOrSelectOptions(depth + 1)

            if (!options['other']) {
              throw new FluentParseError(
                `Select must have an 'other' option`,
                pos,
                message,
              )
            }

            trackNode()
            nodes.push({
              type: 'select',
              variable: name,
              options,
            } as SelectNode)
            textStart = pos
            continue
          }

          // Function: {amount, number} or {amount, number, currency}
          let style: string | undefined
          if (pos < len && message[pos] === ',') {
            pos++ // skip ,
            skipWhitespace()
            const styleStart = pos
            while (pos < len && message[pos] !== '}') {
              pos++
            }
            style = message.slice(styleStart, pos).trim()
          }

          if (pos < len && message[pos] === '}') {
            pos++ // skip }
          } else {
            throw new FluentParseError('Expected closing }', pos, message)
          }

          const fnNode: FunctionNode = {
            type: 'function',
            variable: name,
            fn: keyword,
          }
          if (style) {
            fnNode.style = style
          }
          trackNode()
          nodes.push(fnNode)
          textStart = pos
          continue
        }

        if (pos >= len) {
          throw new FluentParseError('Unterminated placeholder: expected closing }', pos, message)
        }
        throw new FluentParseError(`Unexpected character '${message[pos]}'`, pos, message)
      }

      pos++
    }

    flushText(pos)
    return nodes
  }

  function parsePluralOrSelectOptions(depth: number): Record<string, ASTNode[]> {
    const options: Record<string, ASTNode[]> = {}

    while (pos < len && message[pos] !== '}') {
      skipWhitespace()
      if (pos >= len || message[pos] === '}') break

      // Read key: =0, =1, zero, one, two, few, many, other, or select keys
      let key: string
      if (message[pos] === '=') {
        pos++ // skip =
        const numStart = pos
        while (pos < len && DIGIT_REGEX.test(message[pos]!)) {
          pos++
        }
        key = '=' + message.slice(numStart, pos)
      } else {
        key = readIdentifier()
      }

      skipWhitespace()

      if (pos >= len || message[pos] !== '{') {
        throw new FluentParseError(`Expected { after plural/select key '${key}'`, pos, message)
      }
      pos++ // skip {

      const body = parseNodes(depth)

      if (pos >= len || message[pos] !== '}') {
        throw new FluentParseError('Expected closing } for plural/select option', pos, message)
      }
      pos++ // skip }

      options[key] = body
      skipWhitespace()
    }

    if (pos < len && message[pos] === '}') {
      pos++ // skip outer }
    } else {
      throw new FluentParseError('Expected closing } for plural/select', pos, message)
    }

    return options
  }

  const result = parseNodes(0)

  if (pos < len) {
    throw new FluentParseError('Unexpected character', pos, message)
  }

  return result
}
