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
      expect(catalog['Hello'].message).toBe('Hello')
      expect(catalog['Hello'].translation).toBe('Bonjour')
      expect(catalog['Hello'].origin).toBe('App.vue:3')
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
      expect(catalog['Hello'].translation).toBeUndefined()
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
      expect(restored['Hello'].translation).toBe('Bonjour')
      expect(restored['Hello'].origin).toBe('App.vue:3')
    })
  })
})
