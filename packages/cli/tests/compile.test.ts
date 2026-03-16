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

// ─── Edge case tests ────────────────────────────────────────────────────────

describe('compileCatalog edge cases', () => {
  it('produces valid output for empty catalog', () => {
    const output = compileCatalog({}, 'en')
    expect(output).toContain('export default {')
    expect(output).toContain('}')
  })

  it('compiles static string message without variables', () => {
    const catalog: CatalogData = {
      greet: { message: 'Hello', translation: 'Hola' },
    }
    const output = compileCatalog(catalog, 'es')
    expect(output).toContain("'greet': 'Hola'")
    expect(output).not.toContain('(v)')
  })

  it('compiles message with variables as arrow function', () => {
    const catalog: CatalogData = {
      greet: { message: 'Hi {name}', translation: 'Hola {name}' },
    }
    const output = compileCatalog(catalog, 'es')
    expect(output).toContain('(v) => `Hola ${v.name}`')
  })

  it('skips entries marked as obsolete', () => {
    const catalog: CatalogData = {
      active: { message: 'Active' },
      dead: { message: 'Dead', obsolete: true },
    }
    const output = compileCatalog(catalog, 'en')
    expect(output).toContain('active')
    expect(output).not.toContain("'dead'")
  })

  it('escapes single quotes in string literals', () => {
    const catalog: CatalogData = {
      msg: { message: "It's done" },
    }
    const output = compileCatalog(catalog, 'en')
    expect(output).toContain("It\\'s done")
  })

  it('escapes backslash in string literals', () => {
    const catalog: CatalogData = {
      msg: { message: 'path\\to\\file' },
    }
    const output = compileCatalog(catalog, 'en')
    expect(output).toContain('path\\\\to\\\\file')
  })

  it('escapes newlines in string literals', () => {
    const catalog: CatalogData = {
      msg: { message: 'line1\nline2' },
    }
    const output = compileCatalog(catalog, 'en')
    expect(output).toContain('line1\\nline2')
  })
})

describe('compileCatalogSplit edge cases', () => {
  it('compiles ICU plural message', () => {
    const catalog: CatalogData = {
      items: {
        message: '{n, plural, one {# item} other {# items}}',
        translation: '{n, plural, one {# chose} other {# choses}}',
      },
    }
    const output = compileCatalogSplit(catalog, 'fr', ['items'])
    expect(output).toContain('Intl.PluralRules')
    expect(output).toContain('(v) =>')
  })

  it('compiles ICU select message', () => {
    const catalog: CatalogData = {
      gender: {
        message: '{gender, select, male {He} female {She} other {They}}',
      },
    }
    const output = compileCatalogSplit(catalog, 'en', ['gender'])
    expect(output).toContain('(v) =>')
    expect(output).toContain("'He'")
    expect(output).toContain("'She'")
    expect(output).toContain("'They'")
  })

  it('compiles simple variable as template literal', () => {
    const catalog: CatalogData = {
      greet: { message: 'Hello {name}' },
    }
    const output = compileCatalogSplit(catalog, 'en', ['greet'])
    expect(output).toContain('${v.name}')
  })

  it('compiles static string as quoted literal', () => {
    const catalog: CatalogData = {
      msg: { message: 'Static text' },
    }
    const output = compileCatalogSplit(catalog, 'en', ['msg'])
    expect(output).toContain("= 'Static text'")
  })

  it('returns empty catalog comment for no IDs', () => {
    const output = compileCatalogSplit({}, 'en', [])
    expect(output).toContain('// empty catalog')
  })

  it('annotates every export with @__PURE__', () => {
    const catalog: CatalogData = {
      a: { message: 'A' },
      b: { message: 'B {x}' },
      c: { message: '{n, plural, one {#} other {#s}}' },
    }
    const output = compileCatalogSplit(catalog, 'en', ['a', 'b', 'c'])
    const exportLines = output.split('\n').filter(l => l.includes('export const'))
    expect(exportLines.length).toBe(3)
    for (const line of exportLines) {
      expect(line).toContain('/* @__PURE__ */')
    }
  })
})

describe('compileIndex edge cases', () => {
  it('generates locales array', () => {
    const output = compileIndex(['en', 'fr', 'de'], './out')
    expect(output).toContain('export const locales = ["en","fr","de"]')
  })
})

describe('collectAllIds edge cases', () => {
  it('deduplicates and sorts IDs across locales', () => {
    const catalogs: Record<string, CatalogData> = {
      en: { z: { message: 'Z' }, a: { message: 'A' } },
      fr: { a: { message: 'A', translation: 'A-fr' }, m: { message: 'M' } },
    }
    expect(collectAllIds(catalogs)).toEqual(['a', 'm', 'z'])
  })

  it('skips obsolete entries from all locales', () => {
    const catalogs: Record<string, CatalogData> = {
      en: { a: { message: 'A' }, old: { message: 'Old', obsolete: true } },
      fr: { b: { message: 'B' }, old: { message: 'Old', obsolete: true } },
    }
    expect(collectAllIds(catalogs)).toEqual(['a', 'b'])
  })
})

describe('astToJsExpression edge cases (via compileCatalogSplit)', () => {
  it('handles empty AST nodes returning empty string', () => {
    // A message that parses to text-only nodes
    const catalog: CatalogData = {
      empty: { message: '' },
    }
    const output = compileCatalogSplit(catalog, 'en', ['empty'])
    // Empty string message -> static string export
    expect(output).toContain("= ''")
  })

  it('handles # variable in plural (replaced with count value)', () => {
    const catalog: CatalogData = {
      items: { message: '{n, plural, one {# item} other {# items}}' },
    }
    const output = compileCatalogSplit(catalog, 'en', ['items'])
    expect(output).toContain('String(__c)')
  })
})

describe('pluralToJs edge cases (via compileCatalogSplit)', () => {
  it('handles plural with offset', () => {
    const catalog: CatalogData = {
      msg: { message: '{n, plural, offset:1 one {# other} other {# others}}' },
    }
    const output = compileCatalogSplit(catalog, 'en', ['msg'])
    // offset should appear in the compiled output as subtraction
    expect(output).toContain('(v) =>')
  })
})

describe('selectToJs edge cases (via compileCatalogSplit)', () => {
  it('handles select with multiple keys', () => {
    const catalog: CatalogData = {
      msg: { message: '{role, select, admin {Admin} editor {Editor} other {User}}' },
    }
    const output = compileCatalogSplit(catalog, 'en', ['msg'])
    expect(output).toContain("'admin'")
    expect(output).toContain("'editor'")
    expect(output).toContain("'Admin'")
    expect(output).toContain("'Editor'")
    expect(output).toContain("'User'")
  })
})
