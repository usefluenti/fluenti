import type { Plugin } from 'vite'
import type { FluentiPluginOptions } from './types'
import { setResolvedMode, isBuildMode } from './mode-detect'
import { resolve } from 'node:path'
import { transformForDynamicSplit, transformForStaticSplit, injectCatalogImport } from './build-transform'
import { resolveVirtualSplitId, loadVirtualSplitModule } from './virtual-modules'
import { deriveRouteName, parseCompiledCatalog, buildChunkModule, readCatalogSource } from './route-resolve'

export type { FluentiPluginOptions } from './types'

const VIRTUAL_PREFIX = 'virtual:fluenti/messages/'
const RESOLVED_PREFIX = '\0virtual:fluenti/messages/'

function detectFramework(id: string, code: string): 'vue' | 'solid' | 'react' {
  if (id.endsWith('.vue')) return 'vue'
  if (code.includes('solid-js') || code.includes('createSignal') || code.includes('createMemo')) {
    return 'solid'
  }
  if (code.includes('react') || code.includes('useState') || code.includes('useEffect') || code.includes('jsx')) {
    return 'react'
  }
  return 'vue'
}

// ─── FNV-1a hash (same as @fluenti/cli) ──────────────────────────────────────

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

// NodeTypes from @vue/compiler-core (inlined to avoid hard dep at runtime)
const NT_ELEMENT = 1
const NT_TEXT = 2
const NT_INTERPOLATION = 5
const NT_ATTRIBUTE = 6
const NT_DIRECTIVE = 7
const NT_SIMPLE_EXPRESSION = 4

interface LocNode {
  source: string
  start: { offset: number; line: number; column: number }
  end: { offset: number; line: number; column: number }
}

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
  loc?: LocNode
  isStatic?: boolean
}

const EMPTY_LOC: LocNode = {
  source: '',
  start: { offset: 0, line: 1, column: 1 },
  end: { offset: 0, line: 1, column: 1 },
}

interface TransformContext {
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

  // Determine wrapper tag from `tag` prop (default: 'span')
  const wrapperTag = getStaticPropValue(props, 'tag') ?? 'span'

  // Extract rich text from children
  const richText = extractRichTextFromChildren(node.children)
  const message = richText.message

  if (!message) return

  // Change tag from Trans to the wrapper element
  node.tag = wrapperTag

  // Remove Trans-specific props (tag) but keep others like class, id, etc.
  node.props = props.filter(
    (p: ASTNode) => !(p.type === NT_ATTRIBUTE && p.name === 'tag'),
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
        content: `$vtRich('${message.replace(/'/g, "\\'")}', ${elementsLiteral})`,
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
        content: `$t('${message.replace(/'/g, "\\'")}')`,
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

function getStaticPropValue(props: ASTNode[], name: string): string | undefined {
  const prop = props.find(
    (p: ASTNode) => p.type === NT_ATTRIBUTE && p.name === name,
  )
  if (!prop?.value) return undefined
  return typeof prop.value.content === 'string' ? prop.value.content : undefined
}

interface RichTextResult {
  message: string
  elements: Array<{ tag: string; attrs: Record<string, string> }>
  hasElements: boolean
}

function extractRichTextFromChildren(children: ASTNode[]): RichTextResult {
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

// ─── SFC pre-transform fallback for v-t ──────────────────────────────────────
// Used when the nodeTransform can't be injected into @vitejs/plugin-vue

function transformVtDirectives(sfc: string): string {
  const tmplOpen = sfc.match(/<template(\s[^>]*)?>/)
  if (!tmplOpen) return sfc

  const tmplStart = tmplOpen.index! + tmplOpen[0].length
  const tmplCloseIdx = sfc.lastIndexOf('</template>')
  if (tmplCloseIdx < 0) return sfc

  const beforeTemplate = sfc.slice(0, tmplStart)
  let template = sfc.slice(tmplStart, tmplCloseIdx)
  const afterTemplate = sfc.slice(tmplCloseIdx)

  const hasVt = /\bv-t\b/.test(template)
  const hasTrans = /<Trans[\s>]/.test(template)
  const hasPlural = /<Plural[\s/>]/.test(template)

  if (!hasVt && !hasTrans && !hasPlural) return sfc

  if (hasVt) {
    template = transformVtAttribute(template)
    template = transformVtContent(template)
  }
  if (hasTrans) {
    template = transformTransSFC(template)
  }
  if (hasPlural) {
    template = transformPluralSFC(template)
  }

  return beforeTemplate + template + afterTemplate
}

function transformVtAttribute(template: string): string {
  const vtAttrRegex = /<(\w+)(\s[^>]*?)\bv-t\.(\w+)\b([^>]*?)>/g

  return template.replace(vtAttrRegex, (_match, tag: string, before: string, attrName: string, after: string) => {
    if (attrName === 'plural') return _match

    const allAttrs = before + after
    const attrRegex = new RegExp(`\\b${attrName}="([^"]*)"`)
    const attrMatch = allAttrs.match(attrRegex)
    if (!attrMatch) return _match

    const attrValue = attrMatch[1]!
    const msgId = attrValue

    let newBefore = before.replace(/\s*\bv-t\.\w+\b/, '')
    let newAfter = after.replace(/\s*\bv-t\.\w+\b/, '')

    const staticAttrPattern = new RegExp(`\\s*\\b${attrName}="[^"]*"`)
    newBefore = newBefore.replace(staticAttrPattern, '')
    newAfter = newAfter.replace(staticAttrPattern, '')

    return `<${tag}${newBefore} :${attrName}="$t('${msgId}')"${newAfter}>`
  })
}

/**
 * Extract `{{ expr }}` interpolations from v-t content.
 * Returns the message with ICU `{var}` placeholders and a list of variable entries.
 */
function extractTemplateVars(content: string): { message: string; vars: string[] } {
  const vars: string[] = []
  const message = content.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, expr: string) => {
    const trimmed = expr.trim()
    // Strategy B: simple ident → {name}, property → {lastSegment}, complex → {0}
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
    return `{${varName}}`
  })
  return { message, vars }
}

function transformVtContent(template: string): string {
  const vtContentRegex = /<(\w+)(\s[^>]*?)\bv-t(?::([a-zA-Z0-9_.]+))?(?:\.plural)?(?:="([^"]*)")?\b([^>]*)>([\s\S]*?)<\/\1>/g

  return template.replace(vtContentRegex, (_match, tag: string, before: string, explicitId: string | undefined, bindExpr: string | undefined, after: string, content: string) => {
    const isPlural = _match.includes('v-t.plural')

    let cleanBefore = before.replace(/\s*\bv-t(?::[a-zA-Z0-9_.]+)?(?:\.plural)?(?:="[^"]*")?\b/, '')
    let cleanAfter = after.replace(/\s*\bv-t(?::[a-zA-Z0-9_.]+)?(?:\.plural)?(?:="[^"]*")?\b/, '')

    if (isPlural && bindExpr) {
      const forms = content.trim().split('|').map((s: string) => s.trim())
      const categories = forms.length === 2
        ? ['one', 'other']
        : ['one', 'other', 'zero', 'few', 'many'].slice(0, forms.length)
      const icuParts = categories.map((cat, i) => `${cat} {${forms[i] ?? ''}}`)
      const icuMessage = `{${bindExpr}, plural, ${icuParts.join(' ')}}`
      const msgId = explicitId ?? icuMessage
      return `<${tag}${cleanBefore}${cleanAfter}>{{ $t('${msgId}', { ${bindExpr} }) }}</${tag}>`
    }

    const rawContent = content.trim()

    // Check for child HTML elements → rich text with $vtRich
    const childElementRegex = /<(\w+)(\s[^>]*)?>[\s\S]*?<\/\1>/g
    if (childElementRegex.test(rawContent)) {
      const elements: Array<{ tag: string; attrs: Record<string, string> }> = []
      let elemIdx = 0
      const richMessage = rawContent.replace(/<(\w+)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g,
        (_m, childTag: string, attrStr: string, innerContent: string) => {
          const idx = elemIdx++
          const attrs: Record<string, string> = {}
          const attrRegex = /(\w+)="([^"]*)"/g
          let attrMatch
          while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
            attrs[attrMatch[1]!] = attrMatch[2]!
          }
          elements.push({ tag: childTag, attrs })
          return `<${idx}>${innerContent}</${idx}>`
        },
      )
      const msgId = explicitId ?? richMessage
      const escapedMsgId = msgId.replace(/'/g, "\\'")
      // Build elements as JS array literal to avoid JSON quote conflicts with v-html="..."
      const elemEntries = elements.map(el => {
        const attrEntries = Object.entries(el.attrs)
          .map(([k, v]) => `${k}: '${v.replace(/'/g, "\\'")}'`)
          .join(', ')
        return `{ tag: '${el.tag}', attrs: { ${attrEntries} } }`
      })
      const elementsLiteral = `[${elemEntries.join(', ')}]`
      return `<${tag}${cleanBefore}${cleanAfter} v-html="$vtRich('${escapedMsgId}', ${elementsLiteral})"></${tag}>`
    }

    const { message, vars } = extractTemplateVars(rawContent)
    const msgId = explicitId ?? message
    const escapedMsgId = msgId.replace(/'/g, "\\'")

    if (vars.length > 0) {
      return `<${tag}${cleanBefore}${cleanAfter}>{{ $t('${escapedMsgId}', { ${vars.join(', ')} }) }}</${tag}>`
    }

    return `<${tag}${cleanBefore}${cleanAfter}>{{ $t('${escapedMsgId}') }}</${tag}>`
  })
}

// ─── <Trans> SFC pre-transform ────────────────────────────────────────────────

function transformTransSFC(template: string): string {
  // Match <Trans ...>content</Trans> — skip those with a `message` prop (old API)
  const transRegex = /<Trans(\s[^>]*)?>(?!\s*$)([\s\S]*?)<\/Trans>/g

  return template.replace(transRegex, (_match, attrStr: string | undefined, content: string) => {
    const attrs = attrStr ?? ''

    // If <Trans> has a `message` prop, don't transform (old API)
    if (/\bmessage\s*=/.test(attrs)) return _match

    // Extract tag prop (default: 'span')
    const tagMatch = attrs.match(/\btag\s*=\s*"([^"]*)"/)
    const wrapperTag = tagMatch?.[1] ?? 'span'

    // Remove tag prop from attrs
    const cleanAttrs = attrs.replace(/\s*\btag\s*=\s*"[^"]*"/, '')

    const rawContent = content.trim()

    // Check for child HTML elements → rich text with $vtRich
    const childElementRegex = /<(\w+)(\s[^>]*)?>[\s\S]*?<\/\1>/g
    if (childElementRegex.test(rawContent)) {
      const elements: Array<{ tag: string; attrs: Record<string, string> }> = []
      let elemIdx = 0
      const richMessage = rawContent.replace(/<(\w+)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g,
        (_m, childTag: string, childAttrStr: string, innerContent: string) => {
          const idx = elemIdx++
          const childAttrs: Record<string, string> = {}
          const attrRegex = /(\w[\w-]*)="([^"]*)"/g
          let attrMatch
          while ((attrMatch = attrRegex.exec(childAttrStr)) !== null) {
            childAttrs[attrMatch[1]!] = attrMatch[2]!
          }
          elements.push({ tag: childTag, attrs: childAttrs })
          return `<${idx}>${innerContent}</${idx}>`
        },
      )
      const escapedMsg = richMessage.replace(/'/g, "\\'")
      const elemEntries = elements.map(el => {
        const attrEntries = Object.entries(el.attrs)
          .map(([k, v]) => `${k}: '${v.replace(/'/g, "\\'")}'`)
          .join(', ')
        return `{ tag: '${el.tag}', attrs: { ${attrEntries} } }`
      })
      const elementsLiteral = `[${elemEntries.join(', ')}]`
      return `<${wrapperTag}${cleanAttrs} v-html="$vtRich('${escapedMsg}', ${elementsLiteral})"></${wrapperTag}>`
    }

    // Plain text
    const escapedMsg = rawContent.replace(/'/g, "\\'")
    return `<${wrapperTag}${cleanAttrs}>{{ $t('${escapedMsg}') }}</${wrapperTag}>`
  })
}

// ─── <Plural> SFC pre-transform ──────────────────────────────────────────────

function transformPluralSFC(template: string): string {
  // First handle <Plural> with template slot children (rich text)
  const pluralSlotRegex = /<Plural(\s[^>]*?)>([\s\S]*?)<\/Plural>/g
  template = template.replace(pluralSlotRegex, (_match, attrStr: string, content: string) => {
    const attrs = attrStr ?? ''

    // Check if content has template slots
    const templateSlotRegex = /<template\s+#(\w+)\s*>([\s\S]*?)<\/template>/g
    const slots: Array<{ cat: string; content: string }> = []
    let slotMatch
    while ((slotMatch = templateSlotRegex.exec(content)) !== null) {
      slots.push({ cat: slotMatch[1]!, content: slotMatch[2]!.trim() })
    }

    if (slots.length === 0) return _match

    // Extract :value binding
    const valueMatch = attrs.match(/:value\s*=\s*"([^"]*)"/)
    if (!valueMatch) return _match
    const valueExpr = valueMatch[1]!

    // Extract tag prop (default: 'span')
    const tagMatch = attrs.match(/\btag\s*=\s*"([^"]*)"/)
    const wrapperTag = tagMatch?.[1] ?? 'span'

    const PLURAL_CATS = ['zero', 'one', 'two', 'few', 'many', 'other'] as const
    const allElements: Array<{ tag: string; attrs: Record<string, string> }> = []
    const icuParts: string[] = []

    for (const cat of PLURAL_CATS) {
      const slot = slots.find(s => s.cat === cat)
      if (!slot) continue

      const slotContent = slot.content
      // Check for child HTML elements → rich text
      const childElementRegex = /<(\w+)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g
      let branchMessage = slotContent

      if (childElementRegex.test(slotContent)) {
        const baseIndex = allElements.length
        let elemIdx = 0
        branchMessage = slotContent.replace(/<(\w+)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g,
          (_m, childTag: string, childAttrStr: string, innerContent: string) => {
            const globalIdx = baseIndex + elemIdx++
            const childAttrs: Record<string, string> = {}
            const attrRegex = /(\w[\w-]*)="([^"]*)"/g
            let attrMatch
            while ((attrMatch = attrRegex.exec(childAttrStr)) !== null) {
              childAttrs[attrMatch[1]!] = attrMatch[2]!
            }
            allElements.push({ tag: childTag, attrs: childAttrs })
            return `<${globalIdx}>${innerContent}</${globalIdx}>`
          },
        )
      }

      const icuKey = cat === 'zero' ? '=0' : cat
      icuParts.push(`${icuKey} {${branchMessage}}`)
    }

    if (icuParts.length === 0) return _match

    const icuMessage = `{count, plural, ${icuParts.join(' ')}}`
    const escapedMsg = icuMessage.replace(/'/g, "\\'")

    // Collect remaining attrs (strip Plural-specific ones)
    let cleanAttrs = attrs
    cleanAttrs = cleanAttrs.replace(/:value\s*=\s*"[^"]*"/, '')
    cleanAttrs = cleanAttrs.replace(/\btag\s*=\s*"[^"]*"/, '')
    cleanAttrs = cleanAttrs.replace(/\s+/g, ' ').trim()
    const attrsPart = cleanAttrs ? ` ${cleanAttrs}` : ''

    if (allElements.length > 0) {
      const elemEntries = allElements.map(el => {
        const attrEntries = Object.entries(el.attrs)
          .map(([k, v]) => `${k}: '${v.replace(/'/g, "\\'")}'`)
          .join(', ')
        return `{ tag: '${el.tag}', attrs: { ${attrEntries} } }`
      })
      const elementsLiteral = `[${elemEntries.join(', ')}]`
      return `<${wrapperTag}${attrsPart} v-html="$vtRich('${escapedMsg}', ${elementsLiteral}, { count: ${valueExpr} })"></${wrapperTag}>`
    }

    return `<${wrapperTag}${attrsPart} v-text="$t('${escapedMsg}', { ${valueExpr} })"></${wrapperTag}>`
  })

  // Then handle <Plural ... /> (self-closing) or <Plural ...></Plural> without slot content
  const pluralRegex = /<Plural(\s[^>]*?)\/?>(?:<\/Plural>)?/g

  return template.replace(pluralRegex, (_match, attrStr: string) => {
    const attrs = attrStr ?? ''

    // Extract :value binding
    const valueMatch = attrs.match(/:value\s*=\s*"([^"]*)"/)
    if (!valueMatch) return _match
    const valueExpr = valueMatch[1]!

    // Extract tag prop (default: 'span')
    const tagMatch = attrs.match(/\btag\s*=\s*"([^"]*)"/)
    const wrapperTag = tagMatch?.[1] ?? 'span'

    // Extract plural categories
    const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const
    const icuParts: string[] = []

    for (const cat of PLURAL_CATEGORIES) {
      // Match static prop only (not :zero="...")
      const catRegex = new RegExp(`(?<!:)\\b${cat}\\s*=\\s*"([^"]*)"`)
      const catMatch = attrs.match(catRegex)
      if (catMatch) {
        const icuKey = cat === 'zero' ? '=0' : cat
        icuParts.push(`${icuKey} {${catMatch[1]}}`)
      }
    }

    if (icuParts.length === 0) return _match

    const icuMessage = `{${valueExpr}, plural, ${icuParts.join(' ')}}`
    const escapedMsg = icuMessage.replace(/'/g, "\\'")

    // Collect remaining attrs (strip Plural-specific ones)
    let cleanAttrs = attrs
    cleanAttrs = cleanAttrs.replace(/:value\s*=\s*"[^"]*"/, '')
    cleanAttrs = cleanAttrs.replace(/\btag\s*=\s*"[^"]*"/, '')
    for (const cat of PLURAL_CATEGORIES) {
      cleanAttrs = cleanAttrs.replace(new RegExp(`(?<!:)\\b${cat}\\s*=\\s*"[^"]*"`), '')
    }
    cleanAttrs = cleanAttrs.replace(/\s+/g, ' ').trim()
    const attrsPart = cleanAttrs ? ` ${cleanAttrs}` : ''

    return `<${wrapperTag}${attrsPart} v-text="$t('${escapedMsg}', { ${valueExpr} })"></${wrapperTag}>`
  })
}

// ─── t`` tagged template transform ───────────────────────────────────────────

function transformTaggedTemplate(
  code: string,
  framework: 'vue' | 'solid' | 'react',
): { code: string; needsImport: boolean } {
  let result = code
  let needsImport = false

  const taggedRegex = /\bt`((?:[^`\\]|\\.|(\$\{(?:[^}]|\{[^}]*\})*\}))*)`/g
  let match: RegExpExecArray | null

  while ((match = taggedRegex.exec(code)) !== null) {
    needsImport = true
    const fullMatch = match[0]
    const content = match[1]!

    const expressions: string[] = []
    const strings: string[] = []
    let current = ''
    let i = 0

    while (i < content.length) {
      if (content[i] === '\\' && i + 1 < content.length) {
        current += content[i]! + content[i + 1]!
        i += 2
      } else if (content[i] === '$' && content[i + 1] === '{') {
        strings.push(current)
        current = ''
        i += 2
        let depth = 1
        let expr = ''
        while (i < content.length && depth > 0) {
          if (content[i] === '{') depth++
          else if (content[i] === '}') {
            depth--
            if (depth === 0) break
          }
          expr += content[i]
          i++
        }
        expressions.push(expr)
        i++
      } else {
        current += content[i]
        i++
      }
    }
    strings.push(current)

    let icuMessage = ''
    const valueEntries: string[] = []
    let positionalIndex = 0

    for (let j = 0; j < strings.length; j++) {
      icuMessage += strings[j]!
      if (j < expressions.length) {
        const expr = expressions[j]!.trim()
        const varName = classifyExpression(expr)

        if (varName === '') {
          icuMessage += `{${positionalIndex}}`
          const valueExpr = framework === 'vue' ? `unref(${expr})` : expr
          valueEntries.push(`${positionalIndex}: ${valueExpr}`)
          positionalIndex++
        } else {
          icuMessage += `{${varName}}`
          const valueExpr = framework === 'vue' ? `unref(${expr})` : expr
          valueEntries.push(`${varName}: ${valueExpr}`)
        }
      }
    }

    const valuesObj = valueEntries.length > 0
      ? `, { ${valueEntries.join(', ')} }`
      : ''

    // React: direct call (no useMemo — t() is a hash lookup, fast enough)
    // Vue: computed(() => ...)
    // Solid: createMemo(() => ...)
    let replacement: string
    if (framework === 'react') {
      replacement = `__i18n.t('${icuMessage}'${valuesObj})`
    } else {
      const wrapperFn = framework === 'vue' ? 'computed' : 'createMemo'
      replacement = `${wrapperFn}(() => __i18n.t('${icuMessage}'${valuesObj}))`
    }

    result = result.replace(fullMatch, replacement)
  }

  // Match standalone t() calls but NOT .t() or $t() (e.g., __i18n.t(), _ctx.$t())
  const funcRegex = /(?<![.\w$])t\(\s*(['"])((?:[^\\]|\\.)*?)\1\s*(?:,\s*([^)]+))?\)/g

  const funcReplacements: Array<{ start: number; end: number; replacement: string }> = []
  while ((match = funcRegex.exec(result)) !== null) {
    needsImport = true
    const message = match[2]!
    const values = match[3]?.trim()

    const replacement = values
      ? `__i18n.t('${message}', ${values})`
      : `__i18n.t('${message}')`

    funcReplacements.push({ start: match.index, end: match.index + match[0].length, replacement })
  }

  // Apply replacements in reverse order to preserve offsets
  for (let i = funcReplacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = funcReplacements[i]!
    result = result.slice(0, start) + replacement + result.slice(end)
  }

  return { code: result, needsImport }
}

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

function injectImport(code: string, framework: 'vue' | 'solid' | 'react'): string {
  const pkgMap = { vue: '@fluenti/vue', solid: '@fluenti/solid', react: '@fluenti/react' } as const
  const pkg = pkgMap[framework]

  // For React, we import __useI18n (internal hook) and call it at component top level.
  // The Vite plugin injects this at the top of the compiled module.
  // For Vue/Solid, this is module-level code that runs before setup/createI18n,
  // so we must lazily resolve the context on first property access via Proxy.
  // For React, __useI18n is a hook called inside the component function body.
  let importLine: string
  if (framework === 'react') {
    importLine = `import { __useI18n } from '${pkg}';\nconst __i18n = __useI18n();\n`
  } else {
    importLine = `import { useI18n as __useI18n } from '${pkg}';\nlet __i18n_v;\nconst __i18n = new Proxy({}, { get: (_, p) => { __i18n_v ??= __useI18n(); return __i18n_v[p]; } });\n`
  }

  if (framework === 'react') {
    // React: no additional framework imports needed (no computed/createMemo)
    return importLine + code
  }

  if (framework === 'vue') {
    const neededVueImports: string[] = []
    if (!code.includes('unref')) neededVueImports.push('unref')
    if (!code.includes('computed')) neededVueImports.push('computed')

    let result = code
    if (neededVueImports.length > 0) {
      // Try to merge into existing vue import
      const vueImportRegex = /import\s*\{([^}]*)\}\s*from\s*['"]vue['"]/
      const match = result.match(vueImportRegex)
      if (match) {
        const existing = match[1]!.split(',').map(s => s.trim()).filter(Boolean)
        const merged = [...new Set([...existing, ...neededVueImports])].join(', ')
        result = result.replace(vueImportRegex, `import { ${merged} } from 'vue'`)
      } else {
        result = `import { ${neededVueImports.join(', ')} } from 'vue';\n` + result
      }
    }
    return importLine + result
  }

  // Check if createMemo is already imported for solid
  let result = code
  if (!code.includes('createMemo')) {
    const solidImportRegex = /import\s*\{([^}]*)\}\s*from\s*['"]solid-js['"]/
    const match = result.match(solidImportRegex)
    if (match) {
      const existing = match[1]!.split(',').map(s => s.trim()).filter(Boolean)
      const merged = [...new Set([...existing, 'createMemo'])].join(', ')
      result = result.replace(solidImportRegex, `import { ${merged} } from 'solid-js'`)
    } else {
      result = `import { createMemo } from 'solid-js';\n` + result
    }
  }
  return importLine + result
}

// ─── Solid JSX compile-time transform ─────────────────────────────────────────
// Regex-based transform for <Trans> and <Plural> in .tsx/.jsx files.
// Runs before Solid's JSX compiler (enforce: 'pre').

interface SolidJsxTransformResult {
  code: string
  changed: boolean
}

export function transformSolidJsx(code: string): SolidJsxTransformResult {
  let result = code
  let changed = false

  // 1. Transform <Trans>...</Trans> (skip those with a `message` prop)
  const transRegex = /<Trans(\s[^>]*)?>(?!\s*$)([\s\S]*?)<\/Trans>/g
  result = result.replace(transRegex, (_match, attrStr: string | undefined, content: string) => {
    const attrs = attrStr ?? ''

    // Skip <Trans> with `message` prop (old API)
    if (/\bmessage\s*=/.test(attrs)) return _match

    const rawContent = content.trim()
    if (!rawContent) return _match

    // Check for child JSX elements → rich text
    // Solid JSX natively handles child elements, so skip the compile-time
    // transform and let the runtime <Trans> component handle rich text.
    const childElementRegex = /<(\w+)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g
    if (childElementRegex.test(rawContent)) {
      return _match
    }

    changed = true

    // Plain text
    const escapedMsg = rawContent.replace(/'/g, "\\'")
    return `<span>{__i18n.t('${escapedMsg}')}</span>`
  })

  // 2. Transform <Plural value={expr} zero="..." one="..." other="..." />
  // Match both self-closing and open/close forms
  const pluralRegex = /<Plural(\s[^>]*?)\/?>(?:<\/Plural>)?/g
  result = result.replace(pluralRegex, (_match, attrStr: string) => {
    const attrs = attrStr ?? ''

    // Extract value binding: value={expr}
    const valueMatch = attrs.match(/\bvalue=\{([^}]*)\}/)
    if (!valueMatch) return _match

    const valueExpr = valueMatch[1]!.trim()
    if (!valueExpr) return _match

    // Extract plural categories (static string props only)
    const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const
    const icuParts: string[] = []

    for (const cat of PLURAL_CATEGORIES) {
      // Match static prop: cat="value" but not cat={expr}
      const catRegex = new RegExp(`(?<!\\w)${cat}="([^"]*)"`)
      const catMatch = attrs.match(catRegex)
      if (catMatch) {
        const icuKey = cat === 'zero' ? '=0' : cat
        icuParts.push(`${icuKey} {${catMatch[1]}}`)
      }
    }

    if (icuParts.length === 0) return _match

    changed = true

    const icuMessage = `{${valueExpr}, plural, ${icuParts.join(' ')}}`
    const escapedMsg = icuMessage.replace(/'/g, "\\'")
    return `<span textContent={__i18n.t('${escapedMsg}', {${valueExpr}})} />`
  })

  return { code: result, changed }
}

// ─── Plugin entry ────────────────────────────────────────────────────────────

/** Fluenti Vite plugin */
export default function fluentiPlugin(options?: FluentiPluginOptions): Plugin[] {
  const catalogDir = options?.catalogDir ?? 'src/locales/compiled'
  const frameworkOption = options?.framework ?? 'auto'
  const splitting = options?.splitting ?? false
  const sourceLocale = options?.sourceLocale ?? 'en'
  const locales = options?.locales ?? [sourceLocale]
  const defaultBuildLocale = options?.defaultBuildLocale ?? sourceLocale
  let detectedFramework: 'vue' | 'solid' | 'react' = 'vue'

  const virtualPlugin: Plugin = {
    name: 'fluenti:virtual',
    configResolved(config) {
      setResolvedMode(config.command)
    },
    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return '\0' + id
      }
      // Handle split-mode virtual modules
      if (splitting) {
        const resolved = resolveVirtualSplitId(id)
        if (resolved) return resolved
      }
      return undefined
    },
    load(id) {
      if (id.startsWith(RESOLVED_PREFIX)) {
        const locale = id.slice(RESOLVED_PREFIX.length)
        const catalogPath = `${catalogDir}/${locale}.js`
        return `export { default } from '${catalogPath}'`
      }
      // Handle split-mode virtual modules
      if (splitting) {
        const result = loadVirtualSplitModule(id, {
          catalogDir,
          locales,
          sourceLocale,
          defaultBuildLocale,
          framework: detectedFramework,
        })
        if (result) return result
      }
      return undefined
    },
  }

  const vueTemplatePlugin: Plugin = {
    name: 'fluenti:vue-template',
    enforce: 'pre',

    // SFC pre-transform: rewrites v-t directives, <Trans>, and <Plural> in <template>
    // before Vue compiler runs.
    // The nodeTransform (createVtNodeTransform) is exported separately for users who want
    // to configure it manually via @vitejs/plugin-vue's compilerOptions.nodeTransforms.
    transform(code, id) {
      if (!id.endsWith('.vue')) return undefined
      if (!/\bv-t\b/.test(code) && !/<Trans[\s>]/.test(code) && !/<Plural[\s/>]/.test(code)) return undefined

      const transformed = transformVtDirectives(code)
      if (transformed === code) return undefined

      return { code: transformed, map: null }
    },
  }

  const scriptTransformPlugin: Plugin = {
    name: 'fluenti:script-transform',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('node_modules')) return undefined
      if (!id.match(/\.(vue|tsx|jsx|ts|js)(\?|$)/)) return undefined
      if (id.includes('.vue') && !id.includes('type=script')) return undefined
      if (!/\bt[`(]/.test(code)) return undefined

      const framework = frameworkOption === 'auto'
        ? detectFramework(id, code)
        : frameworkOption

      const transformed = transformTaggedTemplate(code, framework)
      if (!transformed.needsImport) return undefined

      const finalCode = injectImport(transformed.code, framework)

      return {
        code: finalCode,
        map: null,
      }
    },
  }

  // Track module → used hashes for per-route splitting
  const moduleMessages = new Map<string, Set<string>>()

  const buildSplitPlugin: Plugin = {
    name: 'fluenti:build-split',
    // No enforce — runs AFTER @vitejs/plugin-vue compiles templates to JavaScript.
    // With enforce: 'pre', this would see raw SFC <template> blocks before Vue
    // compilation, which breaks import injection (imports land outside <script>).
    transform(code, id) {
      if (!splitting) return undefined
      if (!isBuildMode((this as any).environment)) return undefined
      if (id.includes('node_modules')) return undefined
      if (!id.match(/\.(vue|tsx|jsx|ts|js)(\?|$)/)) return undefined

      // Only transform compiled template output (contains $t calls)
      if (!code.includes('$t(')) return undefined

      // Detect framework for this file
      if (frameworkOption === 'auto') {
        detectedFramework = detectFramework(id, code)
      } else {
        detectedFramework = frameworkOption
      }

      // per-route uses the same transform as dynamic ($t → __catalog._hash)
      const strategy = splitting === 'static' ? 'static' : 'dynamic'
      const transformed = strategy === 'static'
        ? transformForStaticSplit(code)
        : transformForDynamicSplit(code)

      if (!transformed.needsCatalogImport) return undefined

      // Track hashes per module for per-route generateBundle
      if (splitting === 'per-route') {
        moduleMessages.set(id, transformed.usedHashes)
      }

      const importStrategy = splitting === 'per-route' ? 'per-route' : strategy
      const finalCode = injectCatalogImport(transformed.code, importStrategy, transformed.usedHashes)
      return { code: finalCode, map: null }
    },

    generateBundle(_outputOptions, bundle) {
      if (splitting !== 'per-route') return
      if (moduleMessages.size === 0) return

      // 1. Map chunks → hashes via moduleMessages
      const chunkHashes = new Map<string, Set<string>>()
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue
        const hashes = new Set<string>()
        for (const moduleId of Object.keys(chunk.modules)) {
          const modHashes = moduleMessages.get(moduleId)
          if (modHashes) {
            for (const h of modHashes) hashes.add(h)
          }
        }
        if (hashes.size > 0) {
          chunkHashes.set(fileName, hashes)
        }
      }

      if (chunkHashes.size === 0) return

      // 2. Classify: shared (≥2 chunks) vs route-specific (1 chunk)
      const hashToChunks = new Map<string, string[]>()
      for (const [chunkName, hashes] of chunkHashes) {
        for (const h of hashes) {
          const chunks = hashToChunks.get(h) ?? []
          chunks.push(chunkName)
          hashToChunks.set(h, chunks)
        }
      }

      const sharedHashes = new Set<string>()
      const routeHashes = new Map<string, Set<string>>()

      for (const [hash, chunks] of hashToChunks) {
        if (chunks.length > 1) {
          sharedHashes.add(hash)
        } else {
          const routeName = deriveRouteName(chunks[0]!)
          const existing = routeHashes.get(routeName) ?? new Set()
          existing.add(hash)
          routeHashes.set(routeName, existing)
        }
      }

      // 3. Read compiled catalogs and emit chunk files
      const absoluteCatalogDir = resolve(process.cwd(), catalogDir)
      for (const locale of locales) {
        const catalogSource = readCatalogSource(absoluteCatalogDir, locale)
        if (!catalogSource) continue
        const catalogExports = parseCompiledCatalog(catalogSource)

        // Emit shared chunk
        if (sharedHashes.size > 0) {
          const sharedCode = buildChunkModule(sharedHashes, catalogExports)
          this.emitFile({
            type: 'asset',
            fileName: `_fluenti/shared-${locale}.js`,
            source: sharedCode,
          })
        }

        // Emit per-route chunks
        for (const [routeName, hashes] of routeHashes) {
          const routeCode = buildChunkModule(hashes, catalogExports)
          this.emitFile({
            type: 'asset',
            fileName: `_fluenti/${routeName}-${locale}.js`,
            source: routeCode,
          })
        }
      }
    },
  }

  const solidJsxPlugin: Plugin = {
    name: 'fluenti:solid-jsx',
    enforce: 'pre',
    transform(code, id) {
      if (!id.match(/\.[tj]sx(\?|$)/)) return undefined
      if (id.includes('node_modules')) return undefined
      if (!/<Trans[\s>]/.test(code) && !/<Plural[\s/>]/.test(code)) return undefined

      // Only run when framework is solid or auto-detected as solid
      const framework = frameworkOption === 'auto'
        ? detectFramework(id, code)
        : frameworkOption
      if (framework !== 'solid') return undefined

      const transformed = transformSolidJsx(code)
      if (!transformed.changed) return undefined

      return { code: transformed.code, map: null }
    },
  }

  const devPlugin: Plugin = {
    name: 'fluenti:dev',
    configureServer(_server) {
      // server reference available via hotUpdate's `this`
    },
    hotUpdate({ file }) {
      if (file.includes(catalogDir)) {
        const modules = [...this.environment.moduleGraph.urlToModuleMap.entries()]
          .filter(([url]) => url.includes('virtual:fluenti'))
          .map(([, mod]) => mod)

        if (modules.length > 0) {
          return modules
        }
      }
      return undefined
    },
  }

  return [virtualPlugin, vueTemplatePlugin, solidJsxPlugin, scriptTransformPlugin, buildSplitPlugin, devPlugin]
}
