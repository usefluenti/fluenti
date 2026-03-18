// ─── Vue compiler nodeTransform for v-t directive ────────────────────────────
//
// This is a compile-time AST transform, NOT a runtime directive.
// It runs during Vue template compilation inside @vitejs/plugin-vue.
//
// Supported patterns:
//   <tag v-t>text</tag>                       → <tag>{{ $t('hash') }}</tag>
//   <tag v-t:explicit.id>text</tag>           → <tag>{{ $t('explicit.id') }}</tag>
//   <tag v-t.plural="countExpr">a | b</tag>  → <tag>{{ $t('hash', { countExpr }) }}</tag>
//   <tag v-t.alt alt="text" />                → <tag :alt="$t('hash')" />
//   <tag v-t.placeholder placeholder="t" />   → <tag :placeholder="$t('hash')" />

import { hashMessage } from '@fluenti/core'

// NodeTypes from @vue/compiler-core (inlined to avoid hard dep at runtime)
export const NT_ELEMENT = 1
export const NT_TEXT = 2
export const NT_INTERPOLATION = 5
export const NT_ATTRIBUTE = 6
export const NT_DIRECTIVE = 7
export const NT_SIMPLE_EXPRESSION = 4

export interface LocNode {
  source: string
  start: { offset: number; line: number; column: number }
  end: { offset: number; line: number; column: number }
}

export interface ASTNode {
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
  loc?: LocNode
  isStatic?: boolean
}

const EMPTY_LOC: LocNode = {
  source: '',
  start: { offset: 0, line: 1, column: 1 },
  end: { offset: 0, line: 1, column: 1 },
}

export interface TransformContext {
  replaceNode(node: ASTNode): void
  removeNode(node?: ASTNode): void
  parent: ASTNode | null
  childIndex: number
}

/**
 * Vue compiler nodeTransform for the v-t directive.
 * Exported for use with @vitejs/plugin-vue's compilerOptions.nodeTransforms.
 */
export type NodeTransform = (node: ASTNode, context: TransformContext) => void | (() => void)

export function createVtNodeTransform(): NodeTransform {
  return (node: ASTNode, _context: TransformContext): void | (() => void) => {
    if (node.type !== NT_ELEMENT) return

    // ─── <Trans> compile-time transform ──────────────────────────────────────
    if (node.tag === 'Trans') {
      return transformTransComponent(node)
    }

    // ─── <Plural> compile-time transform ─────────────────────────────────────
    if (node.tag === 'Plural') {
      return transformPluralComponent(node)
    }

    // ─── v-t directive transform ─────────────────────────────────────────────

    // Find v-t directive
    const vtIdx = (node.props ?? []).findIndex(
      (p: ASTNode) => p.type === NT_DIRECTIVE && p.name === 't',
    )
    if (vtIdx === -1) return

    const vtDirective = node.props![vtIdx]!
    const loc = node.loc ?? EMPTY_LOC

    // Extract rich text from children (handles child elements as <0>content</0>)
    const richText = extractRichTextFromChildren(node.children ?? [])
    const textContent = richText.message

    // Get explicit ID from arg (v-t:myId)
    const argContent = vtDirective.arg?.type === NT_SIMPLE_EXPRESSION
      ? (vtDirective.arg.content as string)
      : undefined

    // Get modifiers
    const modifiers = (vtDirective.modifiers ?? []).map(
      (m: string | ASTNode) => typeof m === 'string' ? m : (m.content as string ?? ''),
    )
    const isPlural = modifiers.includes('plural')
    const RESERVED = new Set(['plural'])
    const attrModifiers = modifiers.filter((m: string) => !RESERVED.has(m))

    // Reconstruct dotted ID from arg + non-reserved modifiers
    const explicitId = argContent
      ? [argContent, ...attrModifiers].join('.')
      : undefined

    // Handle attribute modifiers (v-t.alt, v-t.placeholder)
    const KNOWN_ATTRS = new Set(['alt', 'placeholder', 'title', 'aria-label', 'label'])
    const attrToTranslate = attrModifiers.find((m: string) => KNOWN_ATTRS.has(m))

    if (attrToTranslate && !isPlural) {
      // Find the static attribute
      const attrIdx = (node.props ?? []).findIndex(
        (p: ASTNode) => p.type === NT_ATTRIBUTE && p.name === attrToTranslate,
      )
      if (attrIdx !== -1) {
        const attrNode = node.props![attrIdx]!
        const attrValue = typeof attrNode.value?.content === 'string'
          ? attrNode.value.content
          : ''
        const msgId = attrValue
        const attrLoc = attrNode.loc ?? loc

        // Replace static attribute with dynamic binding: :attr="$t('hash')"
        node.props![attrIdx] = {
          type: NT_DIRECTIVE,
          name: 'bind',
          arg: { type: NT_SIMPLE_EXPRESSION, content: attrToTranslate, isStatic: true, loc: attrLoc } as ASTNode,
          exp: { type: NT_SIMPLE_EXPRESSION, content: `$t('${msgId}')`, isStatic: false, loc: attrLoc } as ASTNode,
          modifiers: [],
          loc: attrLoc,
        } as ASTNode
      }
      // Remove v-t directive
      node.props!.splice(vtIdx, 1)
      return
    }

    // Helper to create an interpolation node with proper loc
    function makeInterpolation(exprContent: string): ASTNode {
      return {
        type: NT_INTERPOLATION,
        loc,
        content: {
          type: NT_SIMPLE_EXPRESSION,
          content: exprContent,
          isStatic: false,
          loc,
        },
      } as ASTNode
    }

    const msgId = explicitId ?? textContent

    if (isPlural && vtDirective.exp) {
      const countVar = typeof vtDirective.exp.content === 'string'
        ? vtDirective.exp.content
        : 'count'
      const forms = textContent.split('|').map((s: string) => s.trim())
      const categories = forms.length === 2
        ? ['one', 'other']
        : ['one', 'other', 'zero', 'few', 'many'].slice(0, forms.length)
      const icuParts = categories.map((cat: string, i: number) => `${cat} {${forms[i] ?? ''}}`)
      const icuMessage = `{${countVar}, plural, ${icuParts.join(' ')}}`
      const pluralMsgId = explicitId ?? icuMessage

      node.children = [makeInterpolation(`$t('${pluralMsgId}', { ${countVar} })`)]
    } else if (richText.hasElements) {
      // Rich text: child elements exist — use v-html with $vtRich()
      // Serialise element metadata as a JS array literal
      const elementsLiteral = JSON.stringify(richText.elements)

      // Clear children and add v-html directive
      node.children = []
      node.props!.push({
        type: NT_DIRECTIVE,
        name: 'html',
        exp: {
          type: NT_SIMPLE_EXPRESSION,
          content: `$vtRich('${msgId.replace(/'/g, "\\'")}', ${elementsLiteral})`,
          isStatic: false,
          loc,
        } as ASTNode,
        modifiers: [],
        loc,
      } as ASTNode)
    } else {
      node.children = [makeInterpolation(`$t('${msgId}')`)]
    }

    // Remove v-t directive from props
    node.props!.splice(vtIdx, 1)
  }
}

// ─── <Trans> component compile-time transform ─────────────────────────────────

function transformTransComponent(node: ASTNode): void {
  const props = node.props ?? []
  const loc = node.loc ?? EMPTY_LOC

  // If <Trans> has a `message` prop (old API), don't transform — let runtime handle
  const hasMessageProp = props.some(
    (p: ASTNode) => p.type === NT_ATTRIBUTE && p.name === 'message',
  )
  if (hasMessageProp) return

  // No children means nothing to transform
  if (!node.children || node.children.length === 0) return

  const explicitId = getStaticPropValue(props, 'id')
  const context = getStaticPropValue(props, 'context')
  if (!explicitId && hasDynamicBoundProp(props, 'context')) return
  if (hasDynamicBoundProp(props, 'id')) return

  // Determine wrapper tag from `tag` prop (default: 'span')
  const wrapperTag = getStaticPropValue(props, 'tag') ?? 'span'

  // Extract rich text from children
  const richText = extractRichTextFromChildren(node.children)
  const message = richText.message

  if (!message) return

  const translationId = explicitId ?? hashMessage(message, context)

  // Change tag from Trans to the wrapper element
  node.tag = wrapperTag

  // Remove Trans-specific props while preserving regular DOM attributes.
  const TRANS_PROP_NAMES = new Set(['tag', 'id', 'context', 'comment'])
  node.props = props.filter(
    (p: ASTNode) => {
      if (p.type === NT_ATTRIBUTE && TRANS_PROP_NAMES.has(p.name ?? '')) return false
      if (p.type === NT_DIRECTIVE && p.name === 'bind' &&
        p.arg?.type === NT_SIMPLE_EXPRESSION &&
        TRANS_PROP_NAMES.has((p.arg.content as string) ?? '')) return false
      return true
    },
  )

  if (richText.hasElements) {
    // Rich text: use v-html with $vtRich()
    const elementsLiteral = JSON.stringify(richText.elements)
    node.children = []
    node.props!.push({
      type: NT_DIRECTIVE,
      name: 'html',
      exp: {
        type: NT_SIMPLE_EXPRESSION,
        content: `$vtRich('${translationId.replace(/'/g, "\\'")}', ${elementsLiteral})`,
        isStatic: false,
        loc,
      } as ASTNode,
      modifiers: [],
      loc,
    } as ASTNode)
  } else {
    // Plain text: use {{ $t(message) }}
    node.children = [{
      type: NT_INTERPOLATION,
      loc,
      content: {
        type: NT_SIMPLE_EXPRESSION,
        content: `$t('${translationId.replace(/'/g, "\\'")}')`,
        isStatic: false,
        loc,
      },
    } as ASTNode]
  }
}

// ─── <Plural> component compile-time transform ───────────────────────────────

function transformPluralComponent(node: ASTNode): void {
  const props = node.props ?? []
  const loc = node.loc ?? EMPTY_LOC

  // Extract the value binding expression — must be a v-bind directive (:value="expr")
  const valueProp = props.find(
    (p: ASTNode) => p.type === NT_DIRECTIVE && p.name === 'bind' &&
      p.arg?.type === NT_SIMPLE_EXPRESSION && (p.arg.content as string) === 'value',
  )
  if (!valueProp?.exp) return

  const valueExpr = typeof valueProp.exp.content === 'string'
    ? valueProp.exp.content
    : ''
  if (!valueExpr) return

  // Determine wrapper tag from `tag` prop (default: 'span')
  const wrapperTag = getStaticPropValue(props, 'tag') ?? 'span'

  // Check for slot children (template elements with v-slot directives)
  const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const
  const slotChildren = (node.children ?? []).filter((child: ASTNode) => {
    if (child.type !== NT_ELEMENT || child.tag !== 'template') return false
    return (child.props ?? []).some(
      (p: ASTNode) => p.type === NT_DIRECTIVE && p.name === 'slot',
    )
  })

  if (slotChildren.length > 0) {
    // Rich text path: extract slot content and build ICU message with <N> placeholders
    const allElements: Array<{ tag: string; attrs: Record<string, string> }> = []
    const icuParts: string[] = []

    for (const cat of PLURAL_CATEGORIES) {
      const slotNode = slotChildren.find((child: ASTNode) => {
        return (child.props ?? []).some(
          (p: ASTNode) => p.type === NT_DIRECTIVE && p.name === 'slot' &&
            p.arg?.type === NT_SIMPLE_EXPRESSION && (p.arg.content as string) === cat,
        )
      })
      if (!slotNode) continue

      const richText = extractRichTextFromChildren(slotNode.children ?? [])
      // Remap element indices to be globally unique across all branches
      let branchMessage = richText.message
      if (richText.hasElements) {
        const baseIndex = allElements.length
        for (let i = richText.elements.length - 1; i >= 0; i--) {
          const globalIdx = baseIndex + i
          branchMessage = branchMessage
            .replace(new RegExp(`<${i}>`, 'g'), `<${globalIdx}>`)
            .replace(new RegExp(`</${i}>`, 'g'), `</${globalIdx}>`)
        }
        allElements.push(...richText.elements)
      }

      const icuKey = cat === 'zero' ? '=0' : cat
      icuParts.push(`${icuKey} {${branchMessage}}`)
    }

    if (icuParts.length === 0) return

    const icuMessage = `{count, plural, ${icuParts.join(' ')}}`

    // Change tag from Plural to the wrapper element
    node.tag = wrapperTag

    // Remove all Plural-specific props
    const PLURAL_PROP_NAMES = new Set(['tag', 'value', ...PLURAL_CATEGORIES])
    node.props = props.filter((p: ASTNode) => {
      if (p.type === NT_ATTRIBUTE && PLURAL_PROP_NAMES.has(p.name ?? '')) return false
      if (p.type === NT_DIRECTIVE && p.name === 'bind' &&
        p.arg?.type === NT_SIMPLE_EXPRESSION && (p.arg.content as string) === 'value') return false
      return true
    })

    // Output v-html with $vtRich including values parameter
    const elementsLiteral = JSON.stringify(allElements)
    node.children = []
    node.props!.push({
      type: NT_DIRECTIVE,
      name: 'html',
      exp: {
        type: NT_SIMPLE_EXPRESSION,
        content: `$vtRich('${icuMessage.replace(/'/g, "\\'")}', ${elementsLiteral}, { count: ${valueExpr} })`,
        isStatic: false,
        loc,
      } as ASTNode,
      modifiers: [],
      loc,
    } as ASTNode)
    return
  }

  // Existing string-prop path (unchanged)
  const icuParts: string[] = []

  for (const cat of PLURAL_CATEGORIES) {
    const value = getStaticPropValue(props, cat)
    if (value !== undefined) {
      // Map 'zero' to '=0' (exact match, not CLDR category)
      const icuKey = cat === 'zero' ? '=0' : cat
      icuParts.push(`${icuKey} {${value}}`)
    }
  }

  if (icuParts.length === 0) return

  const icuMessage = `{${valueExpr}, plural, ${icuParts.join(' ')}}`

  // Change tag from Plural to the wrapper element
  node.tag = wrapperTag

  // Remove all Plural-specific props, keep non-Plural attrs (class, id, etc.)
  const PLURAL_PROP_NAMES = new Set(['tag', 'value', ...PLURAL_CATEGORIES])
  node.props = props.filter((p: ASTNode) => {
    if (p.type === NT_ATTRIBUTE && PLURAL_PROP_NAMES.has(p.name ?? '')) return false
    if (p.type === NT_DIRECTIVE && p.name === 'bind' &&
      p.arg?.type === NT_SIMPLE_EXPRESSION && (p.arg.content as string) === 'value') return false
    return true
  })

  // Use v-text directive to avoid Vue template parser issues with {{ }} and ICU braces
  node.children = []
  node.props!.push({
    type: NT_DIRECTIVE,
    name: 'text',
    exp: {
      type: NT_SIMPLE_EXPRESSION,
      content: `$t('${icuMessage.replace(/'/g, "\\'")}', { ${valueExpr} })`,
      isStatic: false,
      loc,
    } as ASTNode,
    modifiers: [],
    loc,
  } as ASTNode)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getStaticPropValue(props: ASTNode[], name: string): string | undefined {
  const prop = props.find(
    (p: ASTNode) => p.type === NT_ATTRIBUTE && p.name === name,
  )
  if (!prop?.value) return undefined
  return typeof prop.value.content === 'string' ? prop.value.content : undefined
}

function hasDynamicBoundProp(props: ASTNode[], name: string): boolean {
  return props.some((prop: ASTNode) => {
    return prop.type === NT_DIRECTIVE
      && prop.name === 'bind'
      && prop.arg?.type === NT_SIMPLE_EXPRESSION
      && (prop.arg.content as string) === name
  })
}

interface RichTextResult {
  message: string
  elements: Array<{ tag: string; attrs: Record<string, string> }>
  hasElements: boolean
}

export function extractRichTextFromChildren(children: ASTNode[]): RichTextResult {
  const elements: Array<{ tag: string; attrs: Record<string, string> }> = []
  let elementIndex = 0

  const parts = children.map((child: ASTNode) => {
    if (child.type === NT_TEXT) {
      return typeof child.content === 'string' ? child.content : ''
    }
    if (child.type === NT_INTERPOLATION && child.content) {
      const expr = typeof child.content === 'string'
        ? child.content
        : (child.content as ASTNode).content as string ?? ''
      return `{{ ${expr} }}`
    }
    if (child.type === NT_ELEMENT && child.tag) {
      const idx = elementIndex++
      const attrs: Record<string, string> = {}
      for (const prop of child.props ?? []) {
        if (prop.type === NT_ATTRIBUTE && prop.name) {
          attrs[prop.name] = typeof prop.value?.content === 'string'
            ? prop.value.content
            : ''
        }
      }
      elements.push({ tag: child.tag, attrs })
      const innerText = extractRichTextFromChildren(child.children ?? []).message
      return `<${idx}>${innerText}</${idx}>`
    }
    return ''
  })

  return {
    message: parts.join('').trim(),
    elements,
    hasElements: elements.length > 0,
  }
}
