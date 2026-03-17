// ─── SFC pre-transform fallback for v-t ──────────────────────────────────────
// Used when the nodeTransform can't be injected into @vitejs/plugin-vue

export function transformVtDirectives(sfc: string): string {
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
