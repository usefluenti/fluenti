import { describe, it, expect } from 'vitest'
import { deriveRouteName, parseCompiledCatalog, buildChunkModule } from '../src/route-resolve'
import { hashMessage } from '@fluenti/core'

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
    const abcExport = hashMessage('abc')
    const defExport = hashMessage('def')
    const ghiExport = hashMessage('ghi')
    const catalog = new Map([
      [abcExport, `export const _${abcExport} = "Hello"`],
      [defExport, `export const _${defExport} = "World"`],
      [ghiExport, `export const _${ghiExport} = "Unused"`],
    ])
    const hashes = new Set(['abc', 'def'])

    const result = buildChunkModule(hashes, catalog)

    expect(result).toContain(`export const _${abcExport} = "Hello"`)
    expect(result).toContain(`export const _${defExport} = "World"`)
    expect(result).not.toContain(`_${ghiExport}`)
    expect(result).toContain(`'abc': _${abcExport}`)
    expect(result).toContain(`'def': _${defExport}`)
  })

  it('skips hashes not found in catalog', () => {
    const abcExport = hashMessage('abc')
    const catalog = new Map([
      [abcExport, `export const _${abcExport} = "Hello"`],
    ])
    const hashes = new Set(['abc', 'missing'])

    const result = buildChunkModule(hashes, catalog)

    expect(result).toContain(`export const _${abcExport} = "Hello"`)
    expect(result).not.toContain('missing')
  })

  it('produces empty module for empty hash set', () => {
    const abcExport = hashMessage('abc')
    const catalog = new Map([[abcExport, `export const _${abcExport} = "Hello"`]])
    const result = buildChunkModule(new Set(), catalog)

    expect(result.trim()).toBe('')
  })

  it('builds module with subset of catalog hashes', () => {
    const h1Export = hashMessage('h1')
    const h2Export = hashMessage('h2')
    const h3Export = hashMessage('h3')
    const h4Export = hashMessage('h4')
    const catalog = new Map([
      [h1Export, `export const _${h1Export} = "One"`],
      [h2Export, `export const _${h2Export} = "Two"`],
      [h3Export, `export const _${h3Export} = "Three"`],
      [h4Export, `export const _${h4Export} = "Four"`],
    ])
    const hashes = new Set(['h2', 'h4'])
    const result = buildChunkModule(hashes, catalog)

    expect(result).toContain(`export const _${h2Export} = "Two"`)
    expect(result).toContain(`export const _${h4Export} = "Four"`)
    expect(result).not.toContain(`_${h1Export}`)
    expect(result).not.toContain(`_${h3Export}`)
    expect(result).toContain(`'h2': _${h2Export}`)
    expect(result).toContain(`'h4': _${h4Export}`)
  })

  it('returns only newline for empty hash set with non-empty catalog', () => {
    const aExport = hashMessage('a')
    const bExport = hashMessage('b')
    const catalog = new Map([
      [aExport, `export const _${aExport} = "A"`],
      [bExport, `export const _${bExport} = "B"`],
    ])
    const result = buildChunkModule(new Set(), catalog)

    expect(result).toBe('\n')
  })
})
