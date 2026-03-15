import { describe, it, expect } from 'vitest'
import { compileCatalog, compileCatalogSplit, compileIndex, collectAllIds } from '../src/compile'
import { hashMessage } from '../src/hash'
import type { CatalogData } from '../src/catalog'

describe('compileCatalog', () => {
  it('compiles plain text messages as string literals', () => {
    const catalog: CatalogData = {
      greeting: { message: 'Hello', translation: 'Bonjour' },
    }
    const output = compileCatalog(catalog, 'fr')

    expect(output).toContain("'greeting': 'Bonjour'")
  })

  it('compiles messages with variables as arrow functions', () => {
    const catalog: CatalogData = {
      greeting: { message: 'Hello {name}', translation: 'Bonjour {name}' },
    }
    const output = compileCatalog(catalog, 'fr')

    expect(output).toContain("'greeting': (v) => `Bonjour ${v.name}`")
  })

  it('uses message as fallback when no translation', () => {
    const catalog: CatalogData = {
      greeting: { message: 'Hello' },
    }
    const output = compileCatalog(catalog, 'en')

    expect(output).toContain("'greeting': 'Hello'")
  })

  it('skips obsolete entries', () => {
    const catalog: CatalogData = {
      greeting: { message: 'Hello', translation: 'Bonjour' },
      old: { message: 'Old', translation: 'Ancien', obsolete: true },
    }
    const output = compileCatalog(catalog, 'fr')

    expect(output).toContain('greeting')
    expect(output).not.toContain("'old'")
  })

  it('produces valid module structure', () => {
    const catalog: CatalogData = {
      a: { message: 'Hello' },
      b: { message: 'Hello {name}' },
    }
    const output = compileCatalog(catalog, 'en')

    expect(output).toContain('export default {')
    expect(output).toContain('} satisfies Record<string, string | ((v?: any) => string)>')
  })

  it('handles empty catalog', () => {
    const output = compileCatalog({}, 'en')

    expect(output).toContain('export default {')
    expect(output).toContain('}')
  })

  it('escapes special characters in string literals', () => {
    const catalog: CatalogData = {
      msg: { message: "It's a test" },
    }
    const output = compileCatalog(catalog, 'en')

    expect(output).toContain("\\'s a test")
  })

  it('handles multiple variables', () => {
    const catalog: CatalogData = {
      msg: { message: '{first} and {second}', translation: '{first} et {second}' },
    }
    const output = compileCatalog(catalog, 'fr')

    expect(output).toContain('${v.first}')
    expect(output).toContain('${v.second}')
  })
})

describe('compileCatalogSplit', () => {
  it('compiles static messages as string literal exports', () => {
    const catalog: CatalogData = {
      greeting: { message: 'Hello', translation: 'Bonjour' },
    }
    const output = compileCatalogSplit(catalog, 'fr', ['greeting'])

    expect(output).toContain('/* @__PURE__ */ export const _')
    expect(output).toContain("= 'Bonjour'")
  })

  it('compiles messages with variables as arrow function exports', () => {
    const catalog: CatalogData = {
      greeting: { message: 'Hello {name}', translation: 'Bonjour {name}' },
    }
    const output = compileCatalogSplit(catalog, 'fr', ['greeting'])

    expect(output).toContain('/* @__PURE__ */ export const _')
    expect(output).toContain('(v) => `Bonjour ${v.name}`')
  })

  it('every export has @__PURE__ annotation', () => {
    const catalog: CatalogData = {
      a: { message: 'Hello' },
      b: { message: 'World {name}' },
    }
    const output = compileCatalogSplit(catalog, 'en', ['a', 'b'])
    const lines = output.trim().split('\n').filter(Boolean)

    for (const line of lines) {
      expect(line).toContain('/* @__PURE__ */')
    }
  })

  it('all locales produce the same export names', () => {
    const catalogEn: CatalogData = {
      greeting: { message: 'Hello' },
      farewell: { message: 'Goodbye' },
    }
    const catalogFr: CatalogData = {
      greeting: { message: 'Hello', translation: 'Bonjour' },
      // farewell missing in FR
    }
    const allIds = collectAllIds({ en: catalogEn, fr: catalogFr })
    const outputEn = compileCatalogSplit(catalogEn, 'en', allIds)
    const outputFr = compileCatalogSplit(catalogFr, 'fr', allIds)

    const extractNames = (code: string) =>
      [...code.matchAll(/export const (\w+)/g)].map((m) => m[1]).sort()

    expect(extractNames(outputEn)).toEqual(extractNames(outputFr))
  })

  it('compiles ICU plural messages as arrow functions using Intl.PluralRules', () => {
    const catalog: CatalogData = {
      items: {
        message: '{count, plural, one {# item} other {# items}}',
        translation: '{count, plural, one {# article} other {# articles}}',
      },
    }
    const output = compileCatalogSplit(catalog, 'fr', ['items'])

    expect(output).toContain('/* @__PURE__ */ export const _')
    expect(output).toContain('Intl.PluralRules')
    expect(output).toContain('(v) =>')
  })

  it('handles empty catalog producing valid empty module', () => {
    const output = compileCatalogSplit({}, 'en', [])

    expect(output).toContain('// empty catalog')
    // Should be parseable (no syntax errors)
    expect(output.length).toBeGreaterThan(0)
  })

  it('falls back to message ID when entry is missing for a locale', () => {
    const catalog: CatalogData = {}
    const output = compileCatalogSplit(catalog, 'fr', ['greeting'])

    expect(output).toContain("= 'greeting'")
  })
})

describe('compileIndex', () => {
  it('generates correct locale list', () => {
    const output = compileIndex(['en', 'zh-CN', 'ja'], './compiled')

    expect(output).toContain("export const locales = [\"en\",\"zh-CN\",\"ja\"]")
  })

  it('generates loader map with dynamic imports', () => {
    const output = compileIndex(['en', 'fr'], './compiled')

    expect(output).toContain("'en': () => import('./en.js')")
    expect(output).toContain("'fr': () => import('./fr.js')")
  })
})

describe('collectAllIds', () => {
  it('returns sorted union of all non-obsolete IDs', () => {
    const catalogs: Record<string, CatalogData> = {
      en: {
        b: { message: 'B' },
        a: { message: 'A' },
      },
      fr: {
        c: { message: 'C', translation: 'C-fr' },
        a: { message: 'A', translation: 'A-fr' },
      },
    }

    expect(collectAllIds(catalogs)).toEqual(['a', 'b', 'c'])
  })

  it('excludes obsolete entries', () => {
    const catalogs: Record<string, CatalogData> = {
      en: {
        a: { message: 'A' },
        old: { message: 'Old', obsolete: true },
      },
    }

    expect(collectAllIds(catalogs)).toEqual(['a'])
  })
})

describe('split compile end-to-end consistency', () => {
  it('compileCatalogSplit export names match hash of message IDs', () => {
    const catalog: CatalogData = {
      'Hello world': { message: 'Hello world', translation: 'Bonjour le monde' },
      'Hello {name}': { message: 'Hello {name}', translation: 'Bonjour {name}' },
    }
    const allIds = ['Hello world', 'Hello {name}']
    const output = compileCatalogSplit(catalog, 'fr', allIds)

    // Each message ID hashed by CLI should appear as an export name
    for (const id of allIds) {
      const hash = hashMessage(id)
      expect(output).toContain(`export const _${hash}`)
    }
  })

  it('all locale files produce identical export names for same IDs', () => {
    const catalogEn: CatalogData = {
      greeting: { message: 'Hello', translation: 'Hello' },
      farewell: { message: 'Bye', translation: 'Bye' },
    }
    const catalogJa: CatalogData = {
      greeting: { message: 'Hello', translation: 'こんにちは' },
      farewell: { message: 'Bye', translation: 'さようなら' },
    }

    const allIds = collectAllIds({ en: catalogEn, ja: catalogJa })
    const outputEn = compileCatalogSplit(catalogEn, 'en', allIds)
    const outputJa = compileCatalogSplit(catalogJa, 'ja', allIds)

    // Extract export const names
    const extractExportNames = (code: string) =>
      [...code.matchAll(/export const (_\w+)/g)].map(m => m[1]).sort()

    const namesEn = extractExportNames(outputEn)
    const namesJa = extractExportNames(outputJa)

    expect(namesEn).toEqual(namesJa)
    expect(namesEn.length).toBe(2)

    // en has English values, ja has Japanese values
    expect(outputEn).toContain("'Hello'")
    expect(outputJa).toContain("'こんにちは'")
  })

  it('compileIndex generates correct dynamic import loaders', () => {
    const index = compileIndex(['en', 'ja', 'zh-CN'], './compiled')

    expect(index).toContain("'en': () => import('./en.js')")
    expect(index).toContain("'ja': () => import('./ja.js')")
    expect(index).toContain("'zh-CN': () => import('./zh-CN.js')")
  })
})
