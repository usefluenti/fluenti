import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import fg from 'fast-glob'

const FRAMEWORKS = ['react', 'vue', 'solid'] as const
const COMPONENT_EXPORTS = new Set(['Trans', 'Plural', 'Select', 'DateTime', 'NumberFormat'])

type FrameworkName = (typeof FRAMEWORKS)[number]

export interface CodemodOptions {
  cwd: string
  include?: string[]
  write?: boolean
}

export interface CodemodFileResult {
  file: string
  changed: boolean
}

export interface CodemodResult {
  changedFiles: CodemodFileResult[]
  changedCount: number
}

interface ParsedSpecifier {
  imported: string
  local: string
  isType: boolean
}

const DEFAULT_GLOBS = [
  'src/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,vue,mdx}',
  'app/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,vue,mdx}',
  'pages/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,vue,mdx}',
  'components/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,vue,mdx}',
  'layouts/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,vue,mdx}',
]

function parseSpecifier(raw: string): ParsedSpecifier {
  const trimmed = raw.trim()
  const isType = trimmed.startsWith('type ')
  const normalized = isType ? trimmed.slice(5).trim() : trimmed
  const parts = normalized.split(/\s+as\s+/)
  const imported = parts[0]!.trim()
  const local = (parts[1] ?? parts[0])!.trim()
  return {
    imported,
    local,
    isType,
  }
}

function formatSpecifier(specifier: ParsedSpecifier): string {
  const prefix = specifier.isType ? 'type ' : ''
  if (specifier.imported === specifier.local) {
    return `${prefix}${specifier.imported}`
  }
  return `${prefix}${specifier.imported} as ${specifier.local}`
}

function dedupeSpecifiers(specifiers: ParsedSpecifier[]): ParsedSpecifier[] {
  const seen = new Set<string>()
  const result: ParsedSpecifier[] = []
  for (const specifier of specifiers) {
    const key = `${specifier.isType ? 'type:' : 'value:'}${specifier.imported}:${specifier.local}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(specifier)
  }
  return result
}

function mergeNamedImports(code: string, source: string): string {
  const pattern = new RegExp(`import\\s*\\{([\\s\\S]*?)\\}\\s*from\\s*['"]${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"];?\\n?`, 'g')
  const matches = [...code.matchAll(pattern)]
  if (matches.length <= 1) return code

  const specifiers = dedupeSpecifiers(
    matches.flatMap((match) => match[1]!.split(',').map((entry) => parseSpecifier(entry)).filter((entry) => entry.imported.length > 0)),
  )
  const mergedImport = `import { ${specifiers.map(formatSpecifier).join(', ')} } from '${source}'\n`

  let first = true
  return code.replace(pattern, () => {
    if (first) {
      first = false
      return mergedImport
    }
    return ''
  })
}

export function rewriteFluentiImports(source: string): { code: string; changed: boolean } {
  let code = source
  let changed = false
  let renameSolidFactory = false

  const importPattern = /import\s*\{([\s\S]*?)\}\s*from\s*['"](@fluenti\/(react|vue|solid)(?:\/components)?)['"];?/g

  code = code.replace(importPattern, (full, specifiersRaw: string, sourcePath: string, framework: FrameworkName) => {
    const specifiers = specifiersRaw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map(parseSpecifier)

    const main: ParsedSpecifier[] = []
    const components: ParsedSpecifier[] = []
    const runtime: ParsedSpecifier[] = []

    for (const specifier of specifiers) {
      const next = { ...specifier }
      if (framework === 'solid' && next.imported === 'createFluentiContext') {
        next.imported = 'createFluenti'
        if (next.local === 'createFluentiContext') {
          next.local = 'createFluenti'
          renameSolidFactory = true
        }
      }

      if (next.imported === 'interpolate') {
        runtime.push({ ...next, isType: false })
        continue
      }

      if (!next.isType && COMPONENT_EXPORTS.has(next.imported) && sourcePath.endsWith('/components')) {
        components.push(next)
        continue
      }

      main.push(next)
    }

    const nextImports: string[] = []
    if (main.length > 0 && !sourcePath.endsWith('/components')) {
      nextImports.push(`import { ${dedupeSpecifiers(main).map(formatSpecifier).join(', ')} } from '@fluenti/${framework}'`)
    }
    if (components.length > 0) {
      nextImports.push(`import { ${dedupeSpecifiers(components).map(formatSpecifier).join(', ')} } from '@fluenti/${framework}/components'`)
    }
    if (runtime.length > 0) {
      nextImports.push(`import { ${dedupeSpecifiers(runtime).map(formatSpecifier).join(', ')} } from '@fluenti/core/runtime'`)
    }
    if (main.length > 0 && sourcePath.endsWith('/components')) {
      nextImports.unshift(`import { ${dedupeSpecifiers(main).map(formatSpecifier).join(', ')} } from '@fluenti/${framework}'`)
    }

    const replacement = nextImports.join('\n')
    if (replacement !== full) {
      changed = true
    }
    return replacement
  })

  if (renameSolidFactory) {
    const renamed = code.replace(/\bcreateFluentiContext\b/g, 'createFluenti')
    if (renamed !== code) {
      code = renamed
      changed = true
    }
  }

  for (const sourcePath of [
    '@fluenti/react',
    '@fluenti/react/components',
    '@fluenti/vue',
    '@fluenti/vue/components',
    '@fluenti/solid',
    '@fluenti/solid/components',
    '@fluenti/core/runtime',
  ]) {
    const merged = mergeNamedImports(code, sourcePath)
    if (merged !== code) {
      code = merged
      changed = true
    }
  }

  return { code, changed }
}

export async function runCodemod(options: CodemodOptions): Promise<CodemodResult> {
  const include = options.include && options.include.length > 0 ? options.include : DEFAULT_GLOBS
  const files = await fg(include, {
    cwd: options.cwd,
    absolute: false,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.fluenti/**'],
  })

  const changedFiles: CodemodFileResult[] = []

  for (const file of files) {
    const path = resolve(options.cwd, file)
    const current = readFileSync(path, 'utf-8')
    const rewritten = rewriteFluentiImports(current)
    if (!rewritten.changed) continue

    if (options.write) {
      writeFileSync(path, rewritten.code, 'utf-8')
    }

    changedFiles.push({ file, changed: true })
  }

  return {
    changedFiles,
    changedCount: changedFiles.length,
  }
}
