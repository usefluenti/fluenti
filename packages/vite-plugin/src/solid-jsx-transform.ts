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
