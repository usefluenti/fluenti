import { describe, it, expect } from 'vitest'
import { readJsonCatalog, writeJsonCatalog } from '../src/json-format'
import type { CatalogData } from '../src/catalog'

describe('JSON format', () => {
  describe('readJsonCatalog', () => {
    it('reads a valid JSON catalog', () => {
      const json = JSON.stringify({
        abc: { message: 'Hello', origin: 'App.vue:3' },
        def: { message: 'World', translation: 'Monde' },
      })
      const catalog = readJsonCatalog(json)

      expect(catalog['abc'].message).toBe('Hello')
      expect(catalog['abc'].origin).toBe('App.vue:3')
      expect(catalog['def'].translation).toBe('Monde')
    })

    it('handles entries with obsolete flag', () => {
      const json = JSON.stringify({
        abc: { message: 'Hello', obsolete: true },
      })
      const catalog = readJsonCatalog(json)

      expect(catalog['abc'].obsolete).toBe(true)
    })

    it('handles empty catalog', () => {
      const catalog = readJsonCatalog('{}')
      expect(Object.keys(catalog)).toHaveLength(0)
    })
  })

  describe('writeJsonCatalog', () => {
    it('writes a catalog to JSON', () => {
      const catalog: CatalogData = {
        abc: { message: 'Hello', origin: 'App.vue:3' },
      }
      const json = writeJsonCatalog(catalog)
      const parsed = JSON.parse(json)

      expect(parsed['abc'].message).toBe('Hello')
      expect(parsed['abc'].origin).toBe('App.vue:3')
    })

    it('omits undefined fields', () => {
      const catalog: CatalogData = {
        abc: { message: 'Hello' },
      }
      const json = writeJsonCatalog(catalog)
      const parsed = JSON.parse(json)

      expect(parsed['abc']).toEqual({ message: 'Hello' })
      expect(Object.keys(parsed['abc'])).not.toContain('translation')
      expect(Object.keys(parsed['abc'])).not.toContain('obsolete')
    })

    it('includes obsolete flag when true', () => {
      const catalog: CatalogData = {
        abc: { message: 'Hello', obsolete: true },
      }
      const json = writeJsonCatalog(catalog)
      const parsed = JSON.parse(json)

      expect(parsed['abc'].obsolete).toBe(true)
    })
  })

  describe('roundtrip', () => {
    it('preserves data through write then read', () => {
      const original: CatalogData = {
        abc: { message: 'Hello', translation: 'Bonjour', origin: 'App.vue:3' },
        def: { message: 'World', obsolete: true },
      }
      const json = writeJsonCatalog(original)
      const restored = readJsonCatalog(json)

      expect(restored['abc'].message).toBe('Hello')
      expect(restored['abc'].translation).toBe('Bonjour')
      expect(restored['abc'].origin).toBe('App.vue:3')
      expect(restored['def'].obsolete).toBe(true)
    })
  })
})
