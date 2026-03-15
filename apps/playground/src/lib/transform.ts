/**
 * Browser-safe SFC/TSX transform preview.
 * Mirrors @fluenti/vite-plugin regex-based transforms.
 * Shows how Fluenti rewrites source code at compile time.
 */

import type { SourceLanguage } from './extract'

// ─── Vue SFC transforms ────────────────────────────────────────────────────

function transformVtAttribute(template: string): string {
  const vtAttrRegex = /<(\w+)(\s[^>]*?)\bv-t\.(\w+)\b([^>]*?)>/g
  return template.replace(vtAttrRegex, (_match, tag: string, before: string, attrName: string, after: string) => {
    if (attrName === 'plural') return _match
    const allAttrs = before + after
    const attrRegex = new RegExp(`\\b${attrName}="([^"]*)"`)
    const attrMatch = allAttrs.match(attrRegex)
    if (!attrMatch) return _match
    const msgId = attrMatch[1]!
    let newBefore = before.replace(/\s*\bv-t\.\w+\b/, '')
    let newAfter = after.replace(/\s*\bv-t\.\w+\b/, '')
    const staticAttrPattern = new RegExp(`\\s*\\b${attrName}="[^"]*"`)
    newBefore = newBefore.replace(staticAttrPattern, '')
    newAfter = newAfter.replace(staticAttrPattern, '')
    return `<${tag}${newBefore} :${attrName}="$t('${msgId}')"${newAfter}>`
  })
}

function extractTemplateVars(content: string): { message: string; vars: string[] } {
  const vars: string[] = []
  const message = content.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, expr: string) => {
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
    return `{${varName}}`
  })
  return { message, vars }
}

function transformVtContent(template: string): string {
  const vtContentRegex = /<(\w+)(\s[^>]*?)\bv-t(?::([a-zA-Z0-9_.]+))?(?:\.plural)?(?:="([^"]*)")?([^>]*)>([\s\S]*?)<\/\1>/g

  return template.replace(vtContentRegex, (_match, tag: string, before: string, explicitId: string | undefined, bindExpr: string | undefined, after: string, content: string) => {
    const isPlural = _match.includes('v-t.plural')
    const cleanBefore = before.replace(/\s*\bv-t(?::[a-zA-Z0-9_.]+)?(?:\.plural)?(?:="[^"]*")?/, '')
    const cleanAfter = after.replace(/\s*\bv-t(?::[a-zA-Z0-9_.]+)?(?:\.plural)?(?:="[^"]*")?/, '')

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

    // Rich text with child elements
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

function transformTransSFC(template: string): string {
  const transRegex = /<Trans(\s[^>]*)?>(?!\s*$)([\s\S]*?)<\/Trans>/g
  return template.replace(transRegex, (_match, attrStr: string | undefined, content: string) => {
    const attrs = attrStr ?? ''
    if (/\bmessage\s*=/.test(attrs)) return _match

    const tagMatch = attrs.match(/\btag\s*=\s*"([^"]*)"/)
    const wrapperTag = tagMatch?.[1] ?? 'span'
    const cleanAttrs = attrs.replace(/\s*\btag\s*=\s*"[^"]*"/, '')
    const rawContent = content.trim()

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

    const escapedMsg = rawContent.replace(/'/g, "\\'")
    return `<${wrapperTag}${cleanAttrs}>{{ $t('${escapedMsg}') }}</${wrapperTag}>`
  })
}

function transformPluralSFC(template: string): string {
  const pluralRegex = /<Plural(\s[^>]*?)\/?>(?:<\/Plural>)?/g
  return template.replace(pluralRegex, (_match, attrStr: string) => {
    const attrs = attrStr ?? ''
    const valueMatch = attrs.match(/:value\s*=\s*"([^"]*)"/)
    if (!valueMatch) return _match
    const valueExpr = valueMatch[1]!

    const tagMatch = attrs.match(/\btag\s*=\s*"([^"]*)"/)
    const wrapperTag = tagMatch?.[1] ?? 'span'

    const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const
    const icuParts: string[] = []
    for (const cat of PLURAL_CATEGORIES) {
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

// ─── Script transforms: t`...` and t() ─────────────────────────────────────

function classifyExpr(expr: string): string {
  const trimmed = expr.trim()
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) return trimmed
  if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(trimmed) && !trimmed.endsWith('.')) {
    const parts = trimmed.split('.')
    return parts[parts.length - 1]!
  }
  return ''
}

function transformScript(code: string, framework: 'vue' | 'solid'): { code: string; needsImport: boolean } {
  let result = code
  let needsImport = false

  // Tagged templates: t`Hello ${name}`
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
          else if (content[i] === '}') { depth--; if (depth === 0) break }
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
        const varName = classifyExpr(expr)
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

    const valuesObj = valueEntries.length > 0 ? `, { ${valueEntries.join(', ')} }` : ''
    const wrapperFn = framework === 'vue' ? 'computed' : 'createMemo'
    const replacement = `${wrapperFn}(() => __i18n.t('${icuMessage}'${valuesObj}))`
    result = result.replace(fullMatch, replacement)
  }

  // Function calls: t('Hello {name}', { name })
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
  for (let i = funcReplacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = funcReplacements[i]!
    result = result.slice(0, start) + replacement + result.slice(end)
  }

  return { code: result, needsImport }
}

function injectImport(code: string, framework: 'vue' | 'solid'): string {
  const pkg = framework === 'vue' ? '@fluenti/vue' : '@fluenti/solid'
  if (framework === 'vue') {
    const importLine = `import { useI18n as __useI18n } from '${pkg}';\nconst __i18n = __useI18n();\n`
    const neededVueImports: string[] = []
    if (!code.includes('unref')) neededVueImports.push('unref')
    if (!code.includes('computed')) neededVueImports.push('computed')

    let result = code
    if (neededVueImports.length > 0) {
      const vueImportRegex = /import\s*\{([^}]*)\}\s*from\s*['"]vue['"]/
      const vMatch = result.match(vueImportRegex)
      if (vMatch) {
        const existing = vMatch[1]!.split(',').map(s => s.trim()).filter(Boolean)
        const merged = [...new Set([...existing, ...neededVueImports])].join(', ')
        result = result.replace(vueImportRegex, `import { ${merged} } from 'vue'`)
      } else {
        result = `import { ${neededVueImports.join(', ')} } from 'vue';\n` + result
      }
    }
    return importLine + result
  }

  const importLine = `import { useI18n as __useI18n } from '${pkg}';\nlet __i18n_v;\nconst __i18n = new Proxy({}, { get: (_, p) => { __i18n_v ??= __useI18n(); return __i18n_v[p]; } });\n`
  let result = code
  if (!code.includes('createMemo')) {
    const solidImportRegex = /import\s*\{([^}]*)\}\s*from\s*['"]solid-js['"]/
    const sMatch = result.match(solidImportRegex)
    if (sMatch) {
      const existing = sMatch[1]!.split(',').map(s => s.trim()).filter(Boolean)
      const merged = [...new Set([...existing, 'createMemo'])].join(', ')
      result = result.replace(solidImportRegex, `import { ${merged} } from 'solid-js'`)
    } else {
      result = `import { createMemo } from 'solid-js';\n` + result
    }
  }
  return importLine + result
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Transform source code showing compile-time rewrites */
export function transformCode(code: string, language: SourceLanguage): string {
  if (language === 'vue') {
    return transformVueSFC(code)
  }
  return transformSolidTsx(code)
}

function transformVueSFC(code: string): string {
  let result = code

  // Transform template section
  const tmplOpen = result.match(/<template(\s[^>]*)?>/)
  if (tmplOpen) {
    const tmplStart = tmplOpen.index! + tmplOpen[0].length
    const tmplCloseIdx = result.lastIndexOf('</template>')
    if (tmplCloseIdx >= 0) {
      const beforeTemplate = result.slice(0, tmplStart)
      let template = result.slice(tmplStart, tmplCloseIdx)
      const afterTemplate = result.slice(tmplCloseIdx)

      if (/\bv-t\b/.test(template)) {
        template = transformVtAttribute(template)
        template = transformVtContent(template)
      }
      if (/<Trans[\s>]/.test(template)) {
        template = transformTransSFC(template)
      }
      if (/<Plural[\s/>]/.test(template)) {
        template = transformPluralSFC(template)
      }

      result = beforeTemplate + template + afterTemplate
    }
  }

  // Transform script sections
  const scriptRegex = /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/g
  result = result.replace(scriptRegex, (_match, open: string, scriptContent: string, close: string) => {
    const { code: transformed, needsImport } = transformScript(scriptContent, 'vue')
    const finalCode = needsImport ? injectImport(transformed, 'vue') : transformed
    return open + finalCode + close
  })

  return result
}

function transformSolidTsx(code: string): string {
  // Transform <Trans> and <Plural> components
  let result = code

  // <Trans>plain text</Trans> → <span>{__i18n.t('...')}</span>
  const transRegex = /<Trans(\s[^>]*)?>(?!\s*$)([\s\S]*?)<\/Trans>/g
  result = result.replace(transRegex, (_match, attrStr: string | undefined, content: string) => {
    const attrs = attrStr ?? ''
    if (/\bmessage\s*=/.test(attrs)) return _match
    const rawContent = content.trim()
    if (!rawContent) return _match
    if (/<(\w+)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g.test(rawContent)) return _match
    const escapedMsg = rawContent.replace(/'/g, "\\'")
    return `<span>{__i18n.t('${escapedMsg}')}</span>`
  })

  // <Plural value={expr} one="..." other="..." /> → <span>{__i18n.t('ICU', { expr })}</span>
  const pluralRegex = /<Plural(\s[^>]*?)\/?>(?:<\/Plural>)?/g
  result = result.replace(pluralRegex, (_match, attrStr: string) => {
    const attrs = attrStr ?? ''
    const valueMatch = attrs.match(/\bvalue=\{([^}]*)\}/)
    if (!valueMatch) return _match
    const valueExpr = valueMatch[1]!.trim()

    const CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const
    const icuParts: string[] = []
    for (const cat of CATEGORIES) {
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
    return `<span>{__i18n.t('${escapedMsg}', { ${valueExpr} })}</span>`
  })

  // Transform script: t`...` and t()
  const { code: transformed, needsImport } = transformScript(result, 'solid')
  return needsImport ? injectImport(transformed, 'solid') : transformed
}
