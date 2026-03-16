import { describe, it, expect } from 'vitest'
import { readPoCatalog, writePoCatalog } from '../src/po-format'
import type { CatalogData } from '../src/catalog'

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

    it('marks obsolete entries with fuzzy flag', () => {
      const catalog: CatalogData = {
        abc: { message: 'Hello', obsolete: true },
      }
      const po = writePoCatalog(catalog)

      expect(po).toContain('#, fuzzy')
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

      expect(catalog['Hello']).toBeDefined()
      expect(catalog['Hello']!.message).toBe('Hello')
      expect(catalog['Hello']!.translation).toBe('Bonjour')
      expect(catalog['Hello']!.origin).toBe('App.vue:3')
    })

    it('reads entries without translation', () => {
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"

msgid "Hello"
msgstr ""
`
      const catalog = readPoCatalog(po)

      expect(catalog['Hello']).toBeDefined()
      expect(catalog['Hello']!.translation).toBeUndefined()
    })
  })

  describe('roundtrip', () => {
    it('preserves data through write then read', () => {
      const original: CatalogData = {
        abc: { message: 'Hello', translation: 'Bonjour', origin: 'App.vue:3' },
      }
      const po = writePoCatalog(original)
      const restored = readPoCatalog(po)

      // PO uses msgid as key, so lookup by message
      expect(restored['Hello']).toBeDefined()
      expect(restored['Hello']!.translation).toBe('Bonjour')
      expect(restored['Hello']!.origin).toBe('App.vue:3')
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
      expect(catalog['Welcome']).toBeDefined()
      expect(catalog['Welcome']!.message).toBe('Welcome')
      expect(catalog['Welcome']!.translation).toBe('Bienvenue')
    })

    it('reads empty PO file (header only)', () => {
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"
`
      const catalog = readPoCatalog(po)
      expect(Object.keys(catalog)).toHaveLength(0)
    })

    it('reads fuzzy entries and marks as obsolete', () => {
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"

#, fuzzy
msgid "Old message"
msgstr "Ancien message"
`
      const catalog = readPoCatalog(po)
      expect(catalog['Old message']).toBeDefined()
      expect(catalog['Old message']!.obsolete).toBe(true)
      expect(catalog['Old message']!.translation).toBe('Ancien message')
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
      expect(catalog['Test']!.origin).toBe('src/App.vue:15')
    })

    it('reads Unicode messages', () => {
      const po = `
msgid ""
msgstr "Content-Type: text/plain; charset=UTF-8\\n"

msgid "Hello"
msgstr "こんにちは"
`
      const catalog = readPoCatalog(po)
      expect(catalog['Hello']!.translation).toBe('こんにちは')
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
      expect(catalog['Long text']).toBeDefined()
      expect(catalog['Long text']!.translation).toBe('First part second part')
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

    it('writes fuzzy flag for obsolete entries', () => {
      const catalog: CatalogData = {
        abc: { message: 'Old', obsolete: true, translation: 'Ancien' },
      }
      const po = writePoCatalog(catalog)
      expect(po).toContain('#, fuzzy')
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

      expect(restored['Simple']!.translation).toBe('Einfach')
      expect(restored['Simple']!.origin).toBe('A.vue:1')
      expect(restored['No translation']).toBeDefined()
      expect(restored['No translation']!.translation).toBeUndefined()
    })
  })
})
