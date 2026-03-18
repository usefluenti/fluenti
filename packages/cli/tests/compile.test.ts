import { describe, it, expect } from 'vitest'
import { compileCatalog, compileIndex, collectAllIds, CATALOG_VERSION } from '../src/compile'
import { hashMessage } from '@fluenti/core'
import type { CatalogData } from '../src/catalog'

describe('compileCatalog', () => {
  it('includes catalog version marker at the top', () => {
    const catalog: CatalogData = {
      greeting: { message: 'Hello', translation: 'Bonjour' },
    }
    const output = compileCatalog(catalog, 'fr', ['greeting'])

    expect(output.startsWith(`// @fluenti/compiled v${CATALOG_VERSION}`)).toBe(true)
  })

  it('compiles plain text messages as @__PURE__ named exports', () => {
    const catalog: CatalogData = {
      greeting: { message: 'Hello', translation: 'Bonjour' },
    }
    const output = compileCatalog(catalog, 'fr', ['greeting'])
    const hash = hashMessage('greeting')

    expect(output).toContain(`/* @__PURE__ */ export const _${hash} = 'Bonjour'`)
  })

  it('compiles messages with variables as arrow function exports', () => {
    const catalog: CatalogData = {
      greeting: { message: 'Hello {name}', translation: 'Bonjour {name}' },
    }
    const output = compileCatalog(catalog, 'fr', ['greeting'])

    expect(output).toContain('/* @__PURE__ */ export const _')
    expect(output).toContain('(v) => `Bonjour ${v.name}`')
  })

  it('uses message as fallback when no translation', () => {
    const catalog: CatalogData = {
      greeting: { message: 'Hello' },
    }
    const output = compileCatalog(catalog, 'en', ['greeting'], 'en')

    expect(output).toContain("= 'Hello'")
  })

  it('every export has @__PURE__ annotation', () => {
    const catalog: CatalogData = {
      a: { message: 'Hello' },
      b: { message: 'World {name}' },
    }
    const output = compileCatalog(catalog, 'en', ['a', 'b'])
    const exportLines = output.split('\n').filter((l) => l.includes('export const'))

    expect(exportLines.length).toBe(2)
    for (const line of exportLines) {
      expect(line).toContain('/* @__PURE__ */')
    }
  })

  it('generates default export with message ID keys', () => {
    const catalog: CatalogData = {
      a: { message: 'Hello' },
      b: { message: 'Hello {name}' },
    }
    const output = compileCatalog(catalog, 'en', ['a', 'b'])
    const hashA = hashMessage('a')
    const hashB = hashMessage('b')

    expect(output).toContain('export default {')
    expect(output).toContain(`'a': _${hashA},`)
    expect(output).toContain(`'b': _${hashB},`)
  })

  it('handles empty catalog with empty default export', () => {
    const output = compileCatalog({}, 'en', [])

    expect(output).toContain('// empty catalog')
    expect(output).toContain('export default {}')
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
    const outputEn = compileCatalog(catalogEn, 'en', allIds)
    const outputFr = compileCatalog(catalogFr, 'fr', allIds)

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
    const output = compileCatalog(catalog, 'fr', ['items'])

    expect(output).toContain('/* @__PURE__ */ export const _')
    expect(output).toContain('Intl.PluralRules')
    expect(output).toContain('(v) =>')
  })

  it('keeps missing non-source locale entries undefined so runtime fallback can resolve', () => {
    const catalog: CatalogData = {}
    const output = compileCatalog(catalog, 'fr', ['greeting'], 'en')

    expect(output).toContain('= undefined')
  })

  it('uses source message for source locale entries with empty msgstr', () => {
    const catalog: CatalogData = {
      mcyyyj: { message: 'This key only exists in English' },
    }
    const output = compileCatalog(catalog, 'en', ['mcyyyj'], 'en')

    expect(output).toContain("= 'This key only exists in English'")
  })

  it('escapes single quotes in string literals', () => {
    const catalog: CatalogData = {
      msg: { message: "It's done" },
    }
    const output = compileCatalog(catalog, 'en', ['msg'])
    expect(output).toContain("It\\'s done")
  })

  it('escapes backslash in string literals', () => {
    const catalog: CatalogData = {
      msg: { message: 'path\\to\\file' },
    }
    const output = compileCatalog(catalog, 'en', ['msg'])
    expect(output).toContain('path\\\\to\\\\file')
  })

  it('escapes newlines in string literals', () => {
    const catalog: CatalogData = {
      msg: { message: 'line1\nline2' },
    }
    const output = compileCatalog(catalog, 'en', ['msg'])
    expect(output).toContain('line1\\nline2')
  })

  it('compiles ICU plural message', () => {
    const catalog: CatalogData = {
      items: {
        message: '{n, plural, one {# item} other {# items}}',
        translation: '{n, plural, one {# chose} other {# choses}}',
      },
    }
    const output = compileCatalog(catalog, 'fr', ['items'])
    expect(output).toContain('Intl.PluralRules')
    expect(output).toContain('(v) =>')
  })

  it('compiles ICU select message', () => {
    const catalog: CatalogData = {
      gender: {
        message: '{gender, select, male {He} female {She} other {They}}',
      },
    }
    const output = compileCatalog(catalog, 'en', ['gender'])
    expect(output).toContain('(v) =>')
    expect(output).toContain("'He'")
    expect(output).toContain("'She'")
    expect(output).toContain("'They'")
  })

  it('compiles simple variable as template literal', () => {
    const catalog: CatalogData = {
      greet: { message: 'Hello {name}' },
    }
    const output = compileCatalog(catalog, 'en', ['greet'])
    expect(output).toContain('${v.name}')
  })

  it('compiles static string as quoted literal', () => {
    const catalog: CatalogData = {
      msg: { message: 'Static text' },
    }
    const output = compileCatalog(catalog, 'en', ['msg'])
    expect(output).toContain("= 'Static text'")
  })

  it('annotates every export with @__PURE__', () => {
    const catalog: CatalogData = {
      a: { message: 'A' },
      b: { message: 'B {x}' },
      c: { message: '{n, plural, one {#} other {#s}}' },
    }
    const output = compileCatalog(catalog, 'en', ['a', 'b', 'c'])
    const exportLines = output.split('\n').filter((l) => l.includes('export const'))
    expect(exportLines.length).toBe(3)
    for (const line of exportLines) {
      expect(line).toContain('/* @__PURE__ */')
    }
  })

  it('handles empty AST nodes returning empty string', () => {
    const catalog: CatalogData = {
      empty: { message: '' },
    }
    const output = compileCatalog(catalog, 'en', ['empty'])
    expect(output).toContain("= ''")
  })

  it('handles # variable in plural (replaced with count value)', () => {
    const catalog: CatalogData = {
      items: { message: '{n, plural, one {# item} other {# items}}' },
    }
    const output = compileCatalog(catalog, 'en', ['items'])
    expect(output).toContain('String(__c)')
  })

  it('handles plural with offset', () => {
    const catalog: CatalogData = {
      msg: { message: '{n, plural, offset:1 one {# other} other {# others}}' },
    }
    const output = compileCatalog(catalog, 'en', ['msg'])
    expect(output).toContain('(v) =>')
  })

  it('handles select with multiple keys', () => {
    const catalog: CatalogData = {
      msg: { message: '{role, select, admin {Admin} editor {Editor} other {User}}' },
    }
    const output = compileCatalog(catalog, 'en', ['msg'])
    expect(output).toContain("'admin'")
    expect(output).toContain("'editor'")
    expect(output).toContain("'Admin'")
    expect(output).toContain("'Editor'")
    expect(output).toContain("'User'")
  })
})

describe('compileCatalog end-to-end consistency', () => {
  it('export names match hash of message IDs', () => {
    const catalog: CatalogData = {
      'Hello world': { message: 'Hello world', translation: 'Bonjour le monde' },
      'Hello {name}': { message: 'Hello {name}', translation: 'Bonjour {name}' },
    }
    const allIds = ['Hello world', 'Hello {name}']
    const output = compileCatalog(catalog, 'fr', allIds)

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
    const outputEn = compileCatalog(catalogEn, 'en', allIds)
    const outputJa = compileCatalog(catalogJa, 'ja', allIds)

    const extractExportNames = (code: string) =>
      [...code.matchAll(/export const (_\w+)/g)].map((m) => m[1]).sort()

    const namesEn = extractExportNames(outputEn)
    const namesJa = extractExportNames(outputJa)

    expect(namesEn).toEqual(namesJa)
    expect(namesEn.length).toBe(2)

    expect(outputEn).toContain("'Hello'")
    expect(outputJa).toContain("'こんにちは'")
  })
})

describe('compileIndex', () => {
  it('generates correct locale list', () => {
    const output = compileIndex(['en', 'zh-CN', 'ja'], './compiled')

    expect(output).toContain('export const locales = ["en","zh-CN","ja"]')
  })

  it('generates loader map with dynamic imports', () => {
    const output = compileIndex(['en', 'fr'], './compiled')

    expect(output).toContain("'en': () => import('./en.js')")
    expect(output).toContain("'fr': () => import('./fr.js')")
  })

  it('generates locales array', () => {
    const output = compileIndex(['en', 'fr', 'de'], './out')
    expect(output).toContain('export const locales = ["en","fr","de"]')
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
