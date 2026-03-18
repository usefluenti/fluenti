import { parse } from '@babel/parser'

export interface SourceLocationPoint {
  line: number
  column: number
  index?: number
}

export interface SourceLocation {
  start: SourceLocationPoint
  end: SourceLocationPoint
}

export interface SourceNode {
  type: string
  start?: number | null
  end?: number | null
  loc?: SourceLocation | null
  [key: string]: unknown
}

export function parseSourceModule(code: string): SourceNode | null {
  try {
    const parsed = parse(code, {
      sourceType: 'module',
      errorRecovery: true,
      plugins: [
        'jsx',
        'typescript',
        'topLevelAwait',
        'importAttributes',
      ],
    }) as unknown as { program?: SourceNode }
    return parsed.program ?? null
  } catch {
    return null
  }
}

export function isSourceNode(value: unknown): value is SourceNode {
  return typeof value === 'object' && value !== null && typeof (value as SourceNode).type === 'string'
}

export function walkSourceAst(
  node: unknown,
  visitor: (node: SourceNode, parent: SourceNode | null) => void,
  parent: SourceNode | null = null,
): void {
  if (!isSourceNode(node)) return

  visitor(node, parent)

  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'type') continue

    if (Array.isArray(value)) {
      for (const child of value) {
        walkSourceAst(child, visitor, node)
      }
      continue
    }

    walkSourceAst(value, visitor, node)
  }
}
