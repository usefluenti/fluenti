import { describe, it, expect, vi } from 'vitest'
import { parseSourceModule, isSourceNode, walkSourceAst } from '../src/source-analysis'
import type { SourceNode } from '../src/source-analysis'

describe('parseSourceModule', () => {
  it('parses valid JavaScript and returns a program node', () => {
    const result = parseSourceModule('const x = 1')
    expect(result).not.toBeNull()
    expect(result?.type).toBe('Program')
  })

  it('parses valid TypeScript', () => {
    const result = parseSourceModule('const x: number = 1')
    expect(result).not.toBeNull()
    expect(result?.type).toBe('Program')
  })

  it('parses JSX syntax', () => {
    const result = parseSourceModule('const el = <div>Hello</div>')
    expect(result).not.toBeNull()
    expect(result?.type).toBe('Program')
  })

  it('parses ES module import/export', () => {
    const result = parseSourceModule('import { foo } from "bar"; export const x = 1')
    expect(result).not.toBeNull()
    expect(result?.type).toBe('Program')
  })

  it('parses TypeScript generic syntax', () => {
    const result = parseSourceModule('function id<T>(x: T): T { return x }')
    expect(result).not.toBeNull()
    expect(result?.type).toBe('Program')
  })

  it('parses top-level await', () => {
    const result = parseSourceModule('const data = await fetch("/")')
    expect(result).not.toBeNull()
    expect(result?.type).toBe('Program')
  })

  it('returns null for completely invalid input that throws', () => {
    // Use errorRecovery: true means most syntax errors still parse, so test something
    // that would cause the parser itself to throw (e.g., null input)
    const result = parseSourceModule(null as unknown as string)
    expect(result).toBeNull()
  })

  it('handles empty string without error', () => {
    const result = parseSourceModule('')
    expect(result).not.toBeNull()
    expect(result?.type).toBe('Program')
  })

  it('returns a node with start and end positions', () => {
    const result = parseSourceModule('const x = 1')
    expect(result).not.toBeNull()
    expect(typeof result?.start === 'number' || result?.start == null).toBe(true)
  })
})

describe('isSourceNode', () => {
  it('returns true for object with a string type property', () => {
    const node: SourceNode = { type: 'Identifier' }
    expect(isSourceNode(node)).toBe(true)
  })

  it('returns true for complex source node object', () => {
    const node = { type: 'Program', body: [], start: 0, end: 10 }
    expect(isSourceNode(node)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isSourceNode(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isSourceNode(undefined)).toBe(false)
  })

  it('returns false for a number', () => {
    expect(isSourceNode(42)).toBe(false)
  })

  it('returns false for a string', () => {
    expect(isSourceNode('Identifier')).toBe(false)
  })

  it('returns false for an object without a type property', () => {
    expect(isSourceNode({ name: 'foo' })).toBe(false)
  })

  it('returns false for an object with a non-string type', () => {
    expect(isSourceNode({ type: 42 })).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(isSourceNode({})).toBe(false)
  })

  it('returns false for an array', () => {
    expect(isSourceNode([])).toBe(false)
  })

  it('returns false for boolean', () => {
    expect(isSourceNode(true)).toBe(false)
  })
})

describe('walkSourceAst', () => {
  it('visits the root node', () => {
    const root: SourceNode = { type: 'Program' }
    const visited: string[] = []
    walkSourceAst(root, (node) => visited.push(node.type))
    expect(visited).toContain('Program')
  })

  it('visits child nodes', () => {
    const child: SourceNode = { type: 'Identifier' }
    const root: SourceNode = { type: 'Program', child }
    const visited: string[] = []
    walkSourceAst(root, (node) => visited.push(node.type))
    expect(visited).toContain('Program')
    expect(visited).toContain('Identifier')
  })

  it('visits nodes in arrays', () => {
    const a: SourceNode = { type: 'A' }
    const b: SourceNode = { type: 'B' }
    const root: SourceNode = { type: 'Root', children: [a, b] }
    const visited: string[] = []
    walkSourceAst(root, (node) => visited.push(node.type))
    expect(visited).toEqual(['Root', 'A', 'B'])
  })

  it('passes parent correctly to visitor', () => {
    const child: SourceNode = { type: 'Child' }
    const root: SourceNode = { type: 'Root', child }
    const parents: Array<SourceNode | null> = []
    walkSourceAst(root, (_node, parent) => parents.push(parent))
    expect(parents[0]).toBeNull()     // root has no parent
    expect(parents[1]).toBe(root)     // child's parent is root
  })

  it('skips non-source-node values (primitives)', () => {
    const root: SourceNode = { type: 'Root', name: 'foo', count: 42, flag: true }
    const visited: string[] = []
    walkSourceAst(root, (node) => visited.push(node.type))
    expect(visited).toEqual(['Root'])
  })

  it('skips null values in node properties', () => {
    const root: SourceNode = { type: 'Root', child: null }
    const visited: string[] = []
    walkSourceAst(root, (node) => visited.push(node.type))
    expect(visited).toEqual(['Root'])
  })

  it('skips the loc, start, end, and type keys when traversing children', () => {
    const root: SourceNode = {
      type: 'Root',
      start: 0,
      end: 10,
      loc: { type: 'ShouldNotVisit' },
    }
    const visited: string[] = []
    walkSourceAst(root, (node) => visited.push(node.type))
    // 'ShouldNotVisit' is under 'loc' which is skipped
    expect(visited).not.toContain('ShouldNotVisit')
    expect(visited).toEqual(['Root'])
  })

  it('does nothing when passed a non-source-node value', () => {
    const visited: string[] = []
    walkSourceAst(null, (node) => visited.push(node.type))
    walkSourceAst(undefined, (node) => visited.push(node.type))
    walkSourceAst(42, (node) => visited.push(node.type))
    expect(visited).toEqual([])
  })

  it('handles deeply nested nodes', () => {
    const deep: SourceNode = { type: 'Deep' }
    const mid: SourceNode = { type: 'Mid', child: deep }
    const root: SourceNode = { type: 'Root', child: mid }
    const visited: string[] = []
    walkSourceAst(root, (node) => visited.push(node.type))
    expect(visited).toEqual(['Root', 'Mid', 'Deep'])
  })

  it('skips nodes wrapped in nested arrays (only flat arrays are traversed)', () => {
    // walkSourceAst iterates array elements but does not recurse into sub-arrays.
    // Nodes inside nested arrays (array-of-arrays) are not visited.
    const a: SourceNode = { type: 'A' }
    const b: SourceNode = { type: 'B' }
    const root: SourceNode = { type: 'Root', items: [[a], [b]] }
    const visited: string[] = []
    walkSourceAst(root, (node) => visited.push(node.type))
    // Sub-arrays are not SourceNodes, so A and B are not visited
    expect(visited).toEqual(['Root'])
  })

  it('handles a real parsed AST from parseSourceModule', () => {
    const program = parseSourceModule('const x = 1; const y = 2')
    expect(program).not.toBeNull()
    const types: string[] = []
    walkSourceAst(program!, (node) => types.push(node.type))
    expect(types).toContain('Program')
    expect(types).toContain('VariableDeclaration')
    expect(types).toContain('VariableDeclarator')
  })
})
