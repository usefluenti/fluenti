// ─── t`` tagged template transform ───────────────────────────────────────────

export function transformTaggedTemplate(
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
    // Vue: computed(() => ...) — Vue needs explicit reactive wrappers
    // Solid: createMemo(() => ...) — needed for reactive text nodes; components
    //   (Trans, Plural) unwrap memo accessors via typeof check
    const escapedIcuMessage = icuMessage.replace(/'/g, "\\'")
    let replacement: string
    if (framework === 'react') {
      replacement = `__i18n.t('${escapedIcuMessage}'${valuesObj})`
    } else {
      const wrapperFn = framework === 'vue' ? 'computed' : 'createMemo'
      replacement = `${wrapperFn}(() => __i18n.t('${escapedIcuMessage}'${valuesObj}))`
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

export function classifyExpression(expr: string): string {
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

export function injectImport(code: string, framework: 'vue' | 'solid' | 'react'): string {
  const pkgMap = { vue: '@fluenti/vue', solid: '@fluenti/solid', react: '@fluenti/react' } as const
  const pkg = pkgMap[framework]

  // For Vue/Solid, this is module-level code that runs before setup/createI18n,
  // so we must lazily resolve the context on first property access via Proxy.
  // For React, we use globalThis.__fluenti_i18n which is set by the I18nProvider
  // at render time. We use a Proxy to defer access so that module-level code
  // (e.g. msg`` descriptors) doesn't fail before the provider has mounted.
  let importLine: string
  if (framework === 'react') {
    importLine = `const __i18n = new Proxy({}, { get: (_, p) => { const i = globalThis.__fluenti_i18n; if (!i) throw new Error('[fluenti] i18n not initialised — ensure <I18nProvider> is mounted'); return i[p]; } });\n`
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

  // Check if createMemo is already imported for solid.
  // We must check the import statement specifically, not just any occurrence of
  // 'createMemo' in the code — the tagged template transform already injected
  // createMemo() calls before this runs.
  let result = code
  const solidImportRegex = /import\s*\{([^}]*)\}\s*from\s*['"]solid-js['"]/
  const solidImportMatch = result.match(solidImportRegex)
  const alreadyImported = solidImportMatch
    ? solidImportMatch[1]!.split(',').map(s => s.trim()).some(s => s === 'createMemo')
    : false
  if (!alreadyImported) {
    if (solidImportMatch) {
      const existing = solidImportMatch[1]!.split(',').map(s => s.trim()).filter(Boolean)
      const merged = [...new Set([...existing, 'createMemo'])].join(', ')
      result = result.replace(solidImportRegex, `import { ${merged} } from 'solid-js'`)
    } else {
      result = `import { createMemo } from 'solid-js';\n` + result
    }
  }
  return importLine + result
}
