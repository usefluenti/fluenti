import { describe, it, expect } from 'vitest'
import { hashMessage } from '@fluenti/core'
import { readPoCatalog, writePoCatalog } from '../src/po-format'
import type { CatalogData } from '../src/catalog'

function key(message: string, context?: string): string {
  return hashMessage(message, context)
}

describe('PO format', () => {
  describe('writePoCatalog', () => {
    it('writes a catalog to PO format', () => {
      const catalog: CatalogData = {
        abc: { message: 'Hello', origin: 'App.vue:3' },
      }
      const po = writePoCatalog(catalog)

      expect(po).toContain('msgid "Hello"')
      expect(po).toContain('msgstr ""')
      expect(po).toContain('#: App.vue:3')
    })

    it('includes translations', () => {
      const catalog: CatalogData = {
        abc: { message: 'Hello', translation: 'Bonjour' },
      }
      const po = writePoCatalog(catalog)

      expect(po).toContain('msgid "Hello"')
      expect(po).toContain('msgstr "Bonjour"')
    })

    it('writes fuzzy flag for fuzzy entries', () => {
      const catalog: CatalogData = {
        abc: { message: 'Hello', fuzzy: true, translation: 'Bonjour' },
      }
      const po = writePoCatalog(catalog)

      expect(po).toContain('#, fuzzy')
    })

    it('does not write fuzzy flag for obsolete-only entries', () => {
      const catalog: CatalogData = {
        abc: { message: 'Hello', obsolete: true },
      }
      const po = writePoCatalog(catalog)

      expect(po).not.toContain('#, fuzzy')
    })
  })

  describe('readPoCatalog', () => {
    it('reads a PO file', () => {
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"

#: App.vue:3
msgid "Hello"
msgstr "Bonjour"
`
      const catalog = readPoCatalog(po)

      expect(catalog[key('Hello')]).toBeDefined()
      expect(catalog[key('Hello')]!.message).toBe('Hello')
      expect(catalog[key('Hello')]!.translation).toBe('Bonjour')
      expect(catalog[key('Hello')]!.origin).toBe('App.vue:3')
    })

    it('reads entries without translation', () => {
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"

msgid "Hello"
msgstr ""
`
      const catalog = readPoCatalog(po)

      expect(catalog[key('Hello')]).toBeDefined()
      expect(catalog[key('Hello')]!.translation).toBeUndefined()
    })
  })

  describe('roundtrip', () => {
    it('preserves data through write then read', () => {
      const original: CatalogData = {
        abc: { message: 'Hello', translation: 'Bonjour', origin: 'App.vue:3' },
      }
      const po = writePoCatalog(original)
      const restored = readPoCatalog(po)

      expect(restored['abc']).toBeDefined()
      expect(restored['abc']!.translation).toBe('Bonjour')
      expect(restored['abc']!.origin).toBe('App.vue:3')
    })
  })

  // ─── Additional edge cases ─────────────────────────────────────────────────

  describe('readPoCatalog edge cases', () => {
    it('reads a valid PO with translation', () => {
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"

#: Component.vue:10
msgid "Welcome"
msgstr "Bienvenue"
`
      const catalog = readPoCatalog(po)
      expect(catalog[key('Welcome')]).toBeDefined()
      expect(catalog[key('Welcome')]!.message).toBe('Welcome')
      expect(catalog[key('Welcome')]!.translation).toBe('Bienvenue')
    })

    it('reads empty PO file (header only)', () => {
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"
`
      const catalog = readPoCatalog(po)
      expect(Object.keys(catalog)).toHaveLength(0)
    })

    it('reads fuzzy entries and marks as fuzzy (not obsolete)', () => {
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"

#, fuzzy
msgid "Old message"
msgstr "Ancien message"
`
      const catalog = readPoCatalog(po)
      expect(catalog[key('Old message')]).toBeDefined()
      expect(catalog[key('Old message')]!.fuzzy).toBe(true)
      expect(catalog[key('Old message')]!.obsolete).toBeUndefined()
      expect(catalog[key('Old message')]!.translation).toBe('Ancien message')
    })

    it('reads reference comments as origin', () => {
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"

#: src/App.vue:15
msgid "Test"
msgstr ""
`
      const catalog = readPoCatalog(po)
      expect(catalog[key('Test')]!.origin).toBe('src/App.vue:15')
    })

    it('reads Unicode messages', () => {
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"

msgid "Hello"
msgstr "こんにちは"
`
      const catalog = readPoCatalog(po)
      expect(catalog[key('Hello')]!.translation).toBe('こんにちは')
    })

    it('reads multiline msgstr', () => {
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"

msgid "Long text"
msgstr ""
"First part "
"second part"
`
      const catalog = readPoCatalog(po)
      expect(catalog[key('Long text')]).toBeDefined()
      expect(catalog[key('Long text')]!.translation).toBe('First part second part')
    })

    it('preserves generated ids from msg() extracted comments', () => {
      const generatedId = key('Administrator')
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"

#. msg\`Administrator\`
msgid "${generatedId}"
msgstr "管理者"
`
      const catalog = readPoCatalog(po)

      expect(catalog[generatedId]).toBeDefined()
      expect(catalog[generatedId]!.message).toBe('Administrator')
      expect(catalog[generatedId]!.translation).toBe('管理者')
    })

    it('restores Trans source messages from extracted comments without double hashing', () => {
      const sourceMessage = 'Read the <0>documentation</0> for more info.'
      const generatedId = key(sourceMessage)
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"

#. Trans: Read the <a>documentation</a> for more info.
msgid "${generatedId}"
msgstr "<0>ドキュメント</0>で詳細をご覧ください。"
`
      const catalog = readPoCatalog(po)

      expect(catalog[generatedId]).toBeDefined()
      expect(catalog[generatedId]!.message).toBe(sourceMessage)
      expect(catalog[generatedId]!.translation).toBe('<0>ドキュメント</0>で詳細をご覧ください。')
    })
  })

  describe('writePoCatalog edge cases', () => {
    it('writes valid PO output with header', () => {
      const catalog: CatalogData = {
        abc: { message: 'Test', translation: 'Teste' },
      }
      const po = writePoCatalog(catalog)
      expect(po).toContain('msgid ""')
      expect(po).toContain('Content-Type')
      expect(po).toContain('msgid "Test"')
      expect(po).toContain('msgstr "Teste"')
    })

    it('includes reference comments for entries with origin', () => {
      const catalog: CatalogData = {
        abc: { message: 'Hello', origin: 'src/App.vue:5' },
      }
      const po = writePoCatalog(catalog)
      expect(po).toContain('#: src/App.vue:5')
    })

    it('writes fuzzy flag for fuzzy entries', () => {
      const catalog: CatalogData = {
        abc: { message: 'Old', fuzzy: true, translation: 'Ancien' },
      }
      const po = writePoCatalog(catalog)
      expect(po).toContain('#, fuzzy')
    })

    it('does not write fuzzy flag for obsolete entries', () => {
      const catalog: CatalogData = {
        abc: { message: 'Old', obsolete: true, translation: 'Ancien' },
      }
      const po = writePoCatalog(catalog)
      expect(po).not.toContain('#, fuzzy')
    })
  })

  describe('multi-origin references', () => {
    it('writes multiple origins as separate reference lines', () => {
      const catalog: CatalogData = {
        abc: { message: 'Hello', origin: ['src/A.vue:1', 'src/B.vue:5'] },
      }
      const po = writePoCatalog(catalog)
      expect(po).toContain('src/A.vue:1')
      expect(po).toContain('src/B.vue:5')
    })

    it('reads multiple reference comments as array origin', () => {
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"

#: src/A.vue:1
#: src/B.vue:5
msgid "Hello"
msgstr ""
`
      const catalog = readPoCatalog(po)
      const entry = catalog[key('Hello')]
      expect(entry).toBeDefined()
      expect(Array.isArray(entry!.origin)).toBe(true)
      expect(entry!.origin).toContain('src/A.vue:1')
      expect(entry!.origin).toContain('src/B.vue:5')
    })

    it('roundtrips multiple origins', () => {
      const original: CatalogData = {
        abc: { message: 'Hello', origin: ['src/A.vue:1', 'src/B.vue:5'] },
      }
      const po = writePoCatalog(original)
      const restored = readPoCatalog(po)
      const entry = restored['abc']
      expect(entry).toBeDefined()
      expect(Array.isArray(entry!.origin)).toBe(true)
      expect(entry!.origin).toContain('src/A.vue:1')
      expect(entry!.origin).toContain('src/B.vue:5')
    })
  })

  describe('fuzzy roundtrip', () => {
    it('preserves fuzzy flag through write/read cycle', () => {
      const original: CatalogData = {
        abc: { message: 'Hello', translation: 'Bonjour', fuzzy: true },
      }
      const po = writePoCatalog(original)
      const restored = readPoCatalog(po)
      expect(restored['abc']!.fuzzy).toBe(true)
      expect(restored['abc']!.obsolete).toBeUndefined()
      expect(restored['abc']!.translation).toBe('Bonjour')
    })
  })

  describe('PO roundtrip edge cases', () => {
    it('preserves all data through write and read cycle', () => {
      const original: CatalogData = {
        a: { message: 'Simple', translation: 'Einfach', origin: 'A.vue:1' },
        b: { message: 'No translation', origin: 'B.vue:2' },
      }
      const po = writePoCatalog(original)
      const restored = readPoCatalog(po)

      expect(restored['a']!.translation).toBe('Einfach')
      expect(restored['a']!.origin).toBe('A.vue:1')
      expect(restored['b']).toBeDefined()
      expect(restored['b']!.translation).toBeUndefined()
    })
  })
})
