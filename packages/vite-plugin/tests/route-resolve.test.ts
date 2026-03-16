import { describe, it, expect } from 'vitest'
import { deriveRouteName, parseCompiledCatalog, buildChunkModule } from '../src/route-resolve'

describe('deriveRouteName', () => {
  it('strips directory and hash from chunk filename', () => {
    expect(deriveRouteName('assets/index-abc123.js')).toBe('index')
  })

  it('strips hash from filename without directory', () => {
    expect(deriveRouteName('about-def456.js')).toBe('about')
  })

  it('handles nested directory paths', () => {
    expect(deriveRouteName('pages/settings-g7h8i9.js')).toBe('settings')
  })

  it('handles filename without hash', () => {
    expect(deriveRouteName('assets/index.js')).toBe('index')
  })

  it('handles short hashes (< 4 chars) — does not strip them', () => {
    expect(deriveRouteName('index-ab.js')).toBe('index-ab')
  })

  it('preserves multi-part names before hash', () => {
    expect(deriveRouteName('assets/user-profile-x1y2z3.js')).toBe('user-profile')
  })

  it('handles filename with only extension', () => {
    expect(deriveRouteName('main.js')).toBe('main')
  })

  it('strips directory prefix from path', () => {
    expect(deriveRouteName('dist/assets/home-ab12cd34.js')).toBe('home')
  })

  it('strips .js extension', () => {
    expect(deriveRouteName('dashboard.js')).toBe('dashboard')
  })

  it('strips trailing hash suffix of 4+ chars', () => {
    expect(deriveRouteName('profile-a1b2c3d4.js')).toBe('profile')
  })
})

describe('parseCompiledCatalog', () => {
  it('extracts simple string exports', () => {
    const source = `/* @__PURE__ */ export const _abc123 = "Hello"\nexport const _def456 = "World"\n`
    const result = parseCompiledCatalog(source)

    expect(result.size).toBe(2)
    expect(result.get('abc123')).toContain('export const _abc123 = "Hello"')
    expect(result.get('def456')).toContain('export const _def456 = "World"')
  })

  it('extracts arrow function exports', () => {
    const source = `export const _abc = (v) => \`Hello \${v.name}\`\n`
    const result = parseCompiledCatalog(source)

    expect(result.size).toBe(1)
    expect(result.get('abc')).toContain('export const _abc = (v) => `Hello ${v.name}`')
  })

  it('handles multi-line function exports', () => {
    const source = [
      'export const _xyz = (v) => {',
      '  const n = v.name',
      '  return `Hello ${n}`',
      '}',
      '',
    ].join('\n')
    const result = parseCompiledCatalog(source)

    expect(result.size).toBe(1)
    const line = result.get('xyz')!
    expect(line).toContain('export const _xyz')
    expect(line).toContain('return `Hello ${n}`')
  })

  it('skips non-export lines', () => {
    const source = `// comment\nconst x = 1\nexport const _a1 = "hi"\n`
    const result = parseCompiledCatalog(source)

    expect(result.size).toBe(1)
    expect(result.has('a1')).toBe(true)
  })

  it('handles PURE annotation prefix', () => {
    const source = `/* @__PURE__ */ export const _h1 = "test"\n`
    const result = parseCompiledCatalog(source)

    expect(result.size).toBe(1)
    expect(result.has('h1')).toBe(true)
  })

  it('returns empty map for empty source', () => {
    expect(parseCompiledCatalog('')).toEqual(new Map())
  })

  it('extracts string exports with quoted values', () => {
    const source = `export const _x1 = "Bonjour"\nexport const _x2 = "Monde"\n`
    const result = parseCompiledCatalog(source)

    expect(result.size).toBe(2)
    expect(result.get('x1')).toContain('"Bonjour"')
    expect(result.get('x2')).toContain('"Monde"')
  })

  it('extracts function exports with arrow syntax', () => {
    const source = `export const _fn1 = (v) => \`Hi \${v.name}\`\n`
    const result = parseCompiledCatalog(source)

    expect(result.size).toBe(1)
    expect(result.get('fn1')).toContain('(v) => `Hi ${v.name}`')
  })

  it('handles @__PURE__ annotation prefix', () => {
    const source = `/* @__PURE__ */ export const _pure1 = "Pure"\n`
    const result = parseCompiledCatalog(source)

    expect(result.size).toBe(1)
    expect(result.has('pure1')).toBe(true)
    expect(result.get('pure1')).toContain('/* @__PURE__ */')
  })
})

describe('buildChunkModule', () => {
  it('builds module with selected hashes only', () => {
    const catalog = new Map([
      ['abc', 'export const _abc = "Hello"'],
      ['def', 'export const _def = "World"'],
      ['ghi', 'export const _ghi = "Unused"'],
    ])
    const hashes = new Set(['abc', 'def'])

    const result = buildChunkModule(hashes, catalog)

    expect(result).toContain('export const _abc = "Hello"')
    expect(result).toContain('export const _def = "World"')
    expect(result).not.toContain('_ghi')
  })

  it('skips hashes not found in catalog', () => {
    const catalog = new Map([
      ['abc', 'export const _abc = "Hello"'],
    ])
    const hashes = new Set(['abc', 'missing'])

    const result = buildChunkModule(hashes, catalog)

    expect(result).toContain('export const _abc = "Hello"')
    expect(result).not.toContain('missing')
  })

  it('produces empty module for empty hash set', () => {
    const catalog = new Map([['abc', 'export const _abc = "Hello"']])
    const result = buildChunkModule(new Set(), catalog)

    expect(result.trim()).toBe('')
  })

  it('builds module with subset of catalog hashes', () => {
    const catalog = new Map([
      ['h1', 'export const _h1 = "One"'],
      ['h2', 'export const _h2 = "Two"'],
      ['h3', 'export const _h3 = "Three"'],
      ['h4', 'export const _h4 = "Four"'],
    ])
    const hashes = new Set(['h2', 'h4'])
    const result = buildChunkModule(hashes, catalog)

    expect(result).toContain('export const _h2 = "Two"')
    expect(result).toContain('export const _h4 = "Four"')
    expect(result).not.toContain('_h1')
    expect(result).not.toContain('_h3')
  })

  it('returns only newline for empty hash set with non-empty catalog', () => {
    const catalog = new Map([
      ['a', 'export const _a = "A"'],
      ['b', 'export const _b = "B"'],
    ])
    const result = buildChunkModule(new Set(), catalog)

    expect(result).toBe('\n')
  })
})
