// ─── SFC pre-transform fallback for v-t ──────────────────────────────────────
// Used when the nodeTransform can't be injected into @vitejs/plugin-vue
// Uses @vue/compiler-sfc AST instead of regex for robust template parsing.

import { hashMessage } from '@fluenti/core'
import { parse as parseSFC } from '@vue/compiler-sfc'

// Vue compiler AST node types
const NT_ELEMENT = 1
const NT_TEXT = 2
const NT_INTERPOLATION = 5
const NT_ATTRIBUTE = 6
const NT_DIRECTIVE = 7

interface ASTNode {
  type: number
  tag?: string
  props?: ASTNode[]
  children?: ASTNode[]
  content?: string | ASTNode
  name?: string
  arg?: ASTNode
  exp?: ASTNode
  modifiers?: Array<string | ASTNode>
  value?: ASTNode
  isSelfClosing?: boolean
  loc: {
    source: string
    start: { offset: number; line: number; column: number }
    end: { offset: number; line: number; column: number }
  }
}

// ─── Preserved utility functions ──────────────────────────────────────────────

function escapeSingleQuotedString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RichChild {
  tag: string
  rawAttrs: string
  selfClosing: boolean
  innerContent: string
}

interface ExtractedRich {
  message: string
  elements: RichChild[]
  hasElements: boolean
}

interface StaticSfcAttrValue {
  kind: 'missing' | 'static' | 'dynamic'
  value?: string
}

interface ReplaceOp {
  start: number
  end: number
  replacement: string
}

// ─── Output helpers (no parsing, kept as-is) ──────────────────────────────────

function serializeElements(elements: readonly RichChild[]): string {
  const entries = elements.map(el => {
    // Escape for JS string + HTML attribute context (v-html="..."):
    // &quot; is decoded by HTML parser before JS evaluates the expression
    const rawAttrsStr = escapeSingleQuotedString(el.rawAttrs).replace(/"/g, '&quot;')
    return `{ tag: '${escapeSingleQuotedString(el.tag)}', rawAttrs: '${rawAttrsStr}' }`
  })
  return `[${entries.join(', ')}]`
}

function buildDescriptorExpression(
  message: string,
  options?: {
    id?: string | undefined
    context?: string | undefined
  },
): string {
  const id = options?.id ?? hashMessage(message, options?.context)
  return `{ id: '${escapeSingleQuotedString(id)}', message: '${escapeSingleQuotedString(message)}' }`
}

// ─── AST helper functions ─────────────────────────────────────────────────────

function getModifierContent(mod: string | ASTNode): string {
  return typeof mod === 'string' ? mod : (mod.content as string) ?? ''
}

function readAttr(props: ASTNode[], name: string): StaticSfcAttrValue {
  for (const prop of props) {
    if (prop.type === NT_DIRECTIVE && prop.name === 'bind') {
      const argContent = typeof prop.arg?.content === 'string' ? prop.arg.content : undefined
      if (argContent === name) {
        return { kind: 'dynamic' }
      }
    }
    if (prop.type === NT_ATTRIBUTE && prop.name === name) {
      const value = typeof prop.value?.content === 'string' ? prop.value.content : ''
      return { kind: 'static', value }
    }
  }
  return { kind: 'missing' }
}

function getBindingExpr(props: ASTNode[], name: string): string | undefined {
  for (const prop of props) {
    if (prop.type === NT_DIRECTIVE && prop.name === 'bind') {
      const argContent = typeof prop.arg?.content === 'string' ? prop.arg.content : undefined
      if (argContent === name) {
        return typeof prop.exp?.content === 'string' ? prop.exp.content : undefined
      }
    }
  }
  return undefined
}

/**
 * Extract rich children from AST child nodes.
 * Converts ElementNodes to indexed placeholders, TextNodes to literal text,
 * and InterpolationNodes to their raw source ({{ expr }}).
 */
function extractRichFromAST(children: ASTNode[]): ExtractedRich {
  const elements: RichChild[] = []
  let message = ''

  for (const child of children) {
    if (child.type === NT_TEXT) {
      message += typeof child.content === 'string' ? child.content : ''
    } else if (child.type === NT_INTERPOLATION) {
      message += child.loc.source
    } else if (child.type === NT_ELEMENT && child.tag) {
      const idx = elements.length
      const rawAttrs = (child.props ?? [])
        .map(p => p.loc.source)
        .join(' ')
      const isSelfClosing = child.isSelfClosing ?? false

      if (isSelfClosing || !child.children?.length) {
        elements.push({ tag: child.tag, rawAttrs, selfClosing: true, innerContent: '' })
        message += `<${idx}/>`
      } else {
        // Collect inner content from the original source between children range
        const firstChild = child.children[0]!
        const lastChild = child.children[child.children.length - 1]!
        const innerContent = child.loc.source.slice(
          firstChild.loc.start.offset - child.loc.start.offset,
          lastChild.loc.end.offset - child.loc.start.offset,
        )
        elements.push({ tag: child.tag, rawAttrs, selfClosing: false, innerContent })
        message += `<${idx}>${innerContent}</${idx}>`
      }
    }
  }

  return { message, elements, hasElements: elements.length > 0 }
}

/**
 * Extract {{ expr }} interpolations from AST children for v-t content.
 * Returns message with ICU {var} placeholders and variable entries.
 */
function extractVarsFromAST(children: ASTNode[]): { message: string; vars: string[] } {
  const vars: string[] = []
  let message = ''

  for (const child of children) {
    if (child.type === NT_TEXT) {
      message += typeof child.content === 'string' ? child.content : ''
    } else if (child.type === NT_INTERPOLATION) {
      const expr = typeof child.content === 'object' && child.content
        ? typeof child.content.content === 'string' ? child.content.content : ''
        : ''
      const trimmed = expr.trim()

      let varName: string
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
        varName = trimmed
      } else if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(trimmed) && !trimmed.endsWith('.')) {
        const parts = trimmed.split('.')
        varName = parts[parts.length - 1]!
      } else {
        varName = String(vars.length)
      }
      vars.push(`${varName}: ${trimmed}`)
      message += `{${varName}}`
    }
  }

  return { message, vars }
}

/**
 * Build the list of remaining props for an element, excluding specific prop nodes.
 * Returns their raw source strings joined with spaces.
 */
function buildCleanAttrs(props: ASTNode[], exclude: Set<ASTNode>): string {
  return props
    .filter(p => !exclude.has(p))
    .map(p => p.loc.source)
    .join(' ')
}

// ─── Transform collectors ─────────────────────────────────────────────────────

const TRANS_ONLY_PROPS = new Set(['tag', 'id', 'context', 'comment'])

function collectVtAttrOps(node: ASTNode, ops: ReplaceOp[]): void {
  const props = node.props ?? []
  const vtDir = props.find(
    p => p.type === NT_DIRECTIVE && p.name === 't' && (p.modifiers ?? []).length > 0,
  )
  if (!vtDir) return

  const modifiers = (vtDir.modifiers ?? []).map(getModifierContent)
  // Skip v-t.plural — handled by collectVtContentOps
  if (modifiers.length === 1 && modifiers[0] === 'plural') return

  const attrName = modifiers.find(m => m !== 'plural')
  if (!attrName) return

  // Find the corresponding static attribute
  const staticAttr = props.find(
    p => p.type === NT_ATTRIBUTE && p.name === attrName,
  )
  if (!staticAttr) return
  const attrValue = typeof staticAttr.value?.content === 'string' ? staticAttr.value.content : ''

  const descriptor = buildDescriptorExpression(attrValue)

  // Build new opening tag: keep all props except v-t.X and the static attr, add :attrName="$t(...)"
  const exclude = new Set([vtDir, staticAttr])
  const remainingAttrs = buildCleanAttrs(props, exclude)
  const newAttrsPart = remainingAttrs ? ` ${remainingAttrs}` : ''

  // Replace the opening tag portion of the element
  const tag = node.tag!
  if (node.isSelfClosing) {
    const replacement = `<${tag}${newAttrsPart} :${attrName}="$t(${descriptor})" />`
    ops.push({ start: node.loc.start.offset, end: node.loc.end.offset, replacement })
  } else {
    // Find the end of the opening tag: start of first child or the inner content
    const children = node.children ?? []
    const openTagEnd = children.length > 0
      ? children[0]!.loc.start.offset
      : node.loc.source.indexOf('>') + node.loc.start.offset + 1
    const newOpenTag = `<${tag}${newAttrsPart} :${attrName}="$t(${descriptor})">`
    ops.push({ start: node.loc.start.offset, end: openTagEnd, replacement: newOpenTag })
  }
}

function collectVtContentOps(node: ASTNode, ops: ReplaceOp[]): void {
  const props = node.props ?? []
  const vtDir = props.find(p => p.type === NT_DIRECTIVE && p.name === 't')
  if (!vtDir) return

  // Skip if this is a pure attribute binding (handled by collectVtAttrOps)
  const modifiers = (vtDir.modifiers ?? []).map(getModifierContent)
  const nonPluralMods = modifiers.filter(m => m !== 'plural')
  // If there's a non-plural modifier that corresponds to an attribute name, skip (attribute binding)
  if (nonPluralMods.length > 0) {
    const attrName = nonPluralMods[0]!
    const hasStaticAttr = props.some(p => p.type === NT_ATTRIBUTE && p.name === attrName)
    if (hasStaticAttr) return
  }

  const isPlural = modifiers.includes('plural')
  const bindExpr = typeof vtDir.exp?.content === 'string' ? vtDir.exp.content : undefined

  // Build explicit ID from arg + non-reserved modifiers
  const RESERVED_MODIFIERS = new Set(['plural'])
  const idSegments = modifiers.filter(m => !RESERVED_MODIFIERS.has(m))
  const argContent = typeof vtDir.arg?.content === 'string' ? vtDir.arg.content : undefined
  const explicitId = argContent ? [argContent, ...idSegments].join('.') : undefined

  const tag = node.tag!
  const children = node.children ?? []

  // Build clean attrs: remove v-t directive
  const exclude = new Set([vtDir])
  const remainingAttrs = buildCleanAttrs(props, exclude)
  const attrsPart = remainingAttrs ? ` ${remainingAttrs}` : ''

  if (isPlural && bindExpr) {
    // Collect text content from children
    const textContent = children
      .filter(c => c.type === NT_TEXT)
      .map(c => (typeof c.content === 'string' ? c.content : '').trim())
      .join('')
    const forms = textContent.split('|').map(s => s.trim())
    const categories = forms.length === 2
      ? ['one', 'other']
      : ['one', 'other', 'zero', 'few', 'many'].slice(0, forms.length)
    const icuParts = categories.map((cat, i) => `${cat} {${forms[i] ?? ''}}`)
    const icuMessage = `{${bindExpr}, plural, ${icuParts.join(' ')}}`
    const descriptor = buildDescriptorExpression(icuMessage, { id: explicitId })
    const replacement = `<${tag}${attrsPart}>{{ $t(${descriptor}, { ${bindExpr} }) }}</${tag}>`
    ops.push({ start: node.loc.start.offset, end: node.loc.end.offset, replacement })
    return
  }

  // Check for rich text (child elements)
  const extracted = extractRichFromAST(children)
  if (extracted.hasElements) {
    const message = extracted.message.trim()
    const descriptor = buildDescriptorExpression(message, { id: explicitId })
    const elementsLiteral = serializeElements(extracted.elements)
    const replacement = `<${tag}${attrsPart} v-html="$vtRich(${descriptor}, ${elementsLiteral})"></${tag}>`
    ops.push({ start: node.loc.start.offset, end: node.loc.end.offset, replacement })
    return
  }

  // Plain text, possibly with interpolation
  const { message, vars } = extractVarsFromAST(children)
  const trimmedMessage = message.trim()
  const descriptor = buildDescriptorExpression(trimmedMessage, { id: explicitId })

  let replacement: string
  if (vars.length > 0) {
    replacement = `<${tag}${attrsPart}>{{ $t(${descriptor}, { ${vars.join(', ')} }) }}</${tag}>`
  } else {
    replacement = `<${tag}${attrsPart}>{{ $t(${descriptor}) }}</${tag}>`
  }
  ops.push({ start: node.loc.start.offset, end: node.loc.end.offset, replacement })
}

function collectTransOps(node: ASTNode, ops: ReplaceOp[]): void {
  if (node.tag !== 'Trans') return
  const props = node.props ?? []
  const children = node.children ?? []

  // Skip if empty content
  if (children.length === 0) return
  // Skip all-whitespace content
  const hasContent = children.some(c => {
    if (c.type === NT_TEXT) return (typeof c.content === 'string' ? c.content : '').trim().length > 0
    return true
  })
  if (!hasContent) return

  // Skip old API: <Trans message="...">
  if (props.some(p => p.type === NT_ATTRIBUTE && p.name === 'message')) return

  const explicitId = readAttr(props, 'id')
  if (explicitId.kind === 'dynamic') return

  const context = readAttr(props, 'context')
  if (!explicitId.value && context.kind === 'dynamic') return

  // Extract tag prop (default: 'span')
  const tagAttr = readAttr(props, 'tag')
  const wrapperTag = tagAttr.value ?? 'span'

  // Build clean attrs: remove Trans-specific props
  const exclude = new Set<ASTNode>()
  for (const p of props) {
    if (p.type === NT_ATTRIBUTE && TRANS_ONLY_PROPS.has(p.name as string)) {
      exclude.add(p)
    }
    if (p.type === NT_DIRECTIVE && p.name === 'bind') {
      const argName = typeof p.arg?.content === 'string' ? p.arg.content : undefined
      if (argName && TRANS_ONLY_PROPS.has(argName)) {
        exclude.add(p)
      }
    }
  }
  const remainingAttrs = buildCleanAttrs(props, exclude)
  const cleanAttrsPart = remainingAttrs ? ` ${remainingAttrs}` : ''

  // Check for rich text
  const extracted = extractRichFromAST(children)
  if (extracted.hasElements) {
    const message = extracted.message.trim()
    const descriptor = buildDescriptorExpression(message, {
      id: explicitId.value,
      context: context.value,
    })
    const elementsLiteral = serializeElements(extracted.elements)
    const replacement = `<${wrapperTag}${cleanAttrsPart} v-html="$vtRich(${descriptor}, ${elementsLiteral})"></${wrapperTag}>`
    ops.push({ start: node.loc.start.offset, end: node.loc.end.offset, replacement })
    return
  }

  // Plain text
  const rawContent = children
    .map(c => (c.type === NT_TEXT && typeof c.content === 'string') ? c.content : '')
    .join('')
    .trim()
  const descriptor = buildDescriptorExpression(rawContent, {
    id: explicitId.value,
    context: context.value,
  })
  const replacement = `<${wrapperTag}${cleanAttrsPart}>{{ $t(${descriptor}) }}</${wrapperTag}>`
  ops.push({ start: node.loc.start.offset, end: node.loc.end.offset, replacement })
}

const PLURAL_CATS = ['zero', 'one', 'two', 'few', 'many', 'other'] as const

function collectPluralOps(node: ASTNode, ops: ReplaceOp[]): void {
  if (node.tag !== 'Plural') return
  const props = node.props ?? []

  const explicitId = readAttr(props, 'id')
  const context = readAttr(props, 'context')
  if (explicitId.kind === 'dynamic') return
  if (!explicitId.value && context.kind === 'dynamic') return

  const valueExpr = getBindingExpr(props, 'value')
  if (!valueExpr) return

  const tagAttr = readAttr(props, 'tag')
  const wrapperTag = tagAttr.value ?? 'span'

  // Check for template slot children
  const children = node.children ?? []
  const slots: Array<{ cat: string; children: ASTNode[] }> = []
  for (const child of children) {
    if (child.type === NT_ELEMENT && child.tag === 'template') {
      const slotDir = (child.props ?? []).find(
        p => p.type === NT_DIRECTIVE && p.name === 'slot',
      )
      if (slotDir) {
        const slotName = typeof slotDir.arg?.content === 'string' ? slotDir.arg.content : undefined
        if (slotName) {
          slots.push({ cat: slotName, children: child.children ?? [] })
        }
      }
    }
  }

  if (slots.length > 0) {
    // Slot mode
    const allElements: RichChild[] = []
    const icuParts: string[] = []

    for (const cat of PLURAL_CATS) {
      const slot = slots.find(s => s.cat === cat)
      if (!slot) continue

      const extracted = extractRichFromAST(slot.children)
      let branchMessage: string

      if (extracted.hasElements) {
        const baseIndex = allElements.length
        branchMessage = extracted.message.replace(/<(\d+)(\/?)>/g, (_m, idxStr: string, slash: string) => {
          return `<${baseIndex + Number(idxStr)}${slash}>`
        }).replace(/<\/(\d+)>/g, (_m, idxStr: string) => {
          return `</${baseIndex + Number(idxStr)}>`
        })
        allElements.push(...extracted.elements)
      } else {
        // Plain text from slot children
        branchMessage = slot.children
          .map(c => (c.type === NT_TEXT && typeof c.content === 'string') ? c.content : '')
          .join('')
          .trim()
      }

      const icuKey = cat === 'zero' ? '=0' : cat
      icuParts.push(`${icuKey} {${branchMessage}}`)
    }

    if (icuParts.length === 0) return

    const icuMessage = `{count, plural, ${icuParts.join(' ')}}`
    const descriptor = buildDescriptorExpression(icuMessage, {
      id: explicitId.value,
      context: context.value,
    })

    // Build clean attrs
    const pluralOnlyProps = new Set([...TRANS_ONLY_PROPS, 'tag'])
    const exclude = new Set<ASTNode>()
    for (const p of props) {
      if (p.type === NT_ATTRIBUTE && pluralOnlyProps.has(p.name as string)) {
        exclude.add(p)
      }
      if (p.type === NT_DIRECTIVE && p.name === 'bind') {
        const argName = typeof p.arg?.content === 'string' ? p.arg.content : undefined
        if (argName === 'value' || (argName && pluralOnlyProps.has(argName))) {
          exclude.add(p)
        }
      }
    }
    const remainingAttrs = buildCleanAttrs(props, exclude)
    const attrsPart = remainingAttrs ? ` ${remainingAttrs}` : ''

    let replacement: string
    if (allElements.length > 0) {
      const elementsLiteral = serializeElements(allElements)
      replacement = `<${wrapperTag}${attrsPart} v-html="$vtRich(${descriptor}, ${elementsLiteral}, { count: ${valueExpr} })"></${wrapperTag}>`
    } else {
      replacement = `<${wrapperTag}${attrsPart} v-text="$t(${descriptor}, { count: ${valueExpr} })"></${wrapperTag}>`
    }
    ops.push({ start: node.loc.start.offset, end: node.loc.end.offset, replacement })
    return
  }

  // Prop mode: read zero/one/two/few/many/other static props
  const icuParts: string[] = []
  const catPropsToExclude = new Set<ASTNode>()

  for (const cat of PLURAL_CATS) {
    const catProp = props.find(p => p.type === NT_ATTRIBUTE && p.name === cat)
    if (catProp) {
      const value = typeof catProp.value?.content === 'string' ? catProp.value.content : ''
      const icuKey = cat === 'zero' ? '=0' : cat
      icuParts.push(`${icuKey} {${value}}`)
      catPropsToExclude.add(catProp)
    }
  }

  if (icuParts.length === 0) return

  const icuMessage = `{count, plural, ${icuParts.join(' ')}}`
  const descriptor = buildDescriptorExpression(icuMessage, {
    id: explicitId.value,
    context: context.value,
  })

  // Build clean attrs: remove :value, tag, id, context, comment, category props
  const exclude = new Set<ASTNode>(catPropsToExclude)
  for (const p of props) {
    if (p.type === NT_ATTRIBUTE && (p.name === 'tag' || TRANS_ONLY_PROPS.has(p.name as string))) {
      exclude.add(p)
    }
    if (p.type === NT_DIRECTIVE && p.name === 'bind') {
      const argName = typeof p.arg?.content === 'string' ? p.arg.content : undefined
      if (argName === 'value' || (argName && TRANS_ONLY_PROPS.has(argName))) {
        exclude.add(p)
      }
    }
  }
  const remainingAttrs = buildCleanAttrs(props, exclude)
  const attrsPart = remainingAttrs ? ` ${remainingAttrs}` : ''

  const replacement = `<${wrapperTag}${attrsPart} v-text="$t(${descriptor}, { count: ${valueExpr} })"></${wrapperTag}>`
  ops.push({ start: node.loc.start.offset, end: node.loc.end.offset, replacement })
}

// ─── AST traversal ────────────────────────────────────────────────────────────

function collectOps(root: ASTNode): ReplaceOp[] {
  const ops: ReplaceOp[] = []

  function walk(node: ASTNode): void {
    if (node.type === NT_ELEMENT) {
      if (node.tag === 'Trans') {
        collectTransOps(node, ops)
        return // Don't recurse into transformed nodes
      }
      if (node.tag === 'Plural') {
        collectPluralOps(node, ops)
        return
      }

      // v-t directive handling
      const hasVt = (node.props ?? []).some(p => p.type === NT_DIRECTIVE && p.name === 't')
      if (hasVt) {
        collectVtAttrOps(node, ops)
        collectVtContentOps(node, ops)
        return
      }
    }

    // Recurse into children
    for (const child of node.children ?? []) {
      walk(child)
    }
  }

  walk(root)
  return ops
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function transformVtDirectives(sfc: string): string {
  // Quick bail: check if there's anything to transform
  if (!/<template[\s>]/.test(sfc)) return sfc
  if (sfc.lastIndexOf('</template>') < 0) return sfc

  const hasVt = /\bv-t\b/.test(sfc)
  const hasTrans = /<Trans[\s>]/.test(sfc)
  const hasPlural = /<Plural[\s/>]/.test(sfc)
  if (!hasVt && !hasTrans && !hasPlural) return sfc

  const { descriptor } = parseSFC(sfc, { pad: false })
  if (!descriptor.template?.ast) return sfc

  const ops = collectOps(descriptor.template.ast as unknown as ASTNode)
  if (ops.length === 0) return sfc

  // Apply replacements from end to start to avoid offset drift
  ops.sort((a, b) => b.start - a.start)
  let result = sfc
  for (const op of ops) {
    result = result.slice(0, op.start) + op.replacement + result.slice(op.end)
  }
  return result
}
