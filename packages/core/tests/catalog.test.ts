import { describe, it, expect } from 'vitest'
import { Catalog } from '../src/catalog'

describe('Catalog', () => {
  it('sets and gets messages', () => {
    const catalog = new Catalog()
    catalog.set('en', { greeting: 'Hello' })
    expect(catalog.get('en', 'greeting')).toBe('Hello')
  })

  it('returns undefined for missing locale', () => {
    const catalog = new Catalog()
    expect(catalog.get('en', 'greeting')).toBeUndefined()
  })

  it('returns undefined for missing id', () => {
    const catalog = new Catalog()
    catalog.set('en', { greeting: 'Hello' })
    expect(catalog.get('en', 'farewell')).toBeUndefined()
  })

  it('merges messages on set', () => {
    const catalog = new Catalog()
    catalog.set('en', { greeting: 'Hello' })
    catalog.set('en', { farewell: 'Bye' })
    expect(catalog.get('en', 'greeting')).toBe('Hello')
    expect(catalog.get('en', 'farewell')).toBe('Bye')
  })

  it('overwrites existing messages', () => {
    const catalog = new Catalog()
    catalog.set('en', { greeting: 'Hello' })
    catalog.set('en', { greeting: 'Hi' })
    expect(catalog.get('en', 'greeting')).toBe('Hi')
  })

  it('has() returns true for existing messages', () => {
    const catalog = new Catalog()
    catalog.set('en', { greeting: 'Hello' })
    expect(catalog.has('en', 'greeting')).toBe(true)
  })

  it('has() returns false for missing messages', () => {
    const catalog = new Catalog()
    expect(catalog.has('en', 'greeting')).toBe(false)
  })

  it('has() returns false for missing locale', () => {
    const catalog = new Catalog()
    catalog.set('en', { greeting: 'Hello' })
    expect(catalog.has('fr', 'greeting')).toBe(false)
  })

  it('getLocales() returns loaded locales', () => {
    const catalog = new Catalog()
    catalog.set('en', { greeting: 'Hello' })
    catalog.set('fr', { greeting: 'Bonjour' })
    expect(catalog.getLocales()).toEqual(['en', 'fr'])
  })

  it('getLocales() returns empty array initially', () => {
    const catalog = new Catalog()
    expect(catalog.getLocales()).toEqual([])
  })

  it('stores compiled functions', () => {
    const catalog = new Catalog()
    const fn = (values?: Record<string, unknown>) => `Hello ${values?.name}`
    catalog.set('en', { greeting: fn })
    const retrieved = catalog.get('en', 'greeting')
    expect(typeof retrieved).toBe('function')
    expect((retrieved as Function)({ name: 'World' })).toBe('Hello World')
  })

  it('supports namespace-style IDs', () => {
    const catalog = new Catalog()
    catalog.set('en', { 'common:greeting': 'Hello', 'auth:login': 'Log in' })
    expect(catalog.get('en', 'common:greeting')).toBe('Hello')
    expect(catalog.get('en', 'auth:login')).toBe('Log in')
  })

  // ─── Prototype pollution prevention ──────────────────────────────────────

  describe('prototype pollution prevention', () => {
    it('has() returns false for __proto__', () => {
      const catalog = new Catalog()
      catalog.set('en', { greeting: 'Hello' })
      expect(catalog.has('en', '__proto__')).toBe(false)
    })

    it('has() returns false for constructor', () => {
      const catalog = new Catalog()
      catalog.set('en', { greeting: 'Hello' })
      expect(catalog.has('en', 'constructor')).toBe(false)
    })

    it('has() returns false for toString', () => {
      const catalog = new Catalog()
      catalog.set('en', { greeting: 'Hello' })
      expect(catalog.has('en', 'toString')).toBe(false)
    })

    it('get() returns undefined for prototype properties', () => {
      const catalog = new Catalog()
      catalog.set('en', { greeting: 'Hello' })
      expect(catalog.get('en', '__proto__')).toBeUndefined()
      expect(catalog.get('en', 'constructor')).toBeUndefined()
      expect(catalog.get('en', 'toString')).toBeUndefined()
    })

    it('set key __proto__ does not pollute prototype chain', () => {
      const catalog = new Catalog()
      catalog.set('en', { '__proto__': 'malicious' as any })
      // Should not pollute Object.prototype
      expect(({} as any).__proto__).not.toBe('malicious')
      // The key should be retrievable if explicitly set
      expect(catalog.has('en', '__proto__')).toBe(false)
    })
  })

  // ─── Edge cases ──────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles empty string locale', () => {
      const catalog = new Catalog()
      catalog.set('', { greeting: 'Hello' })
      expect(catalog.get('', 'greeting')).toBe('Hello')
      expect(catalog.has('', 'greeting')).toBe(true)
    })

    it('treats locale case-sensitively', () => {
      const catalog = new Catalog()
      catalog.set('en', { greeting: 'Hello' })
      expect(catalog.get('EN', 'greeting')).toBeUndefined()
      expect(catalog.has('EN', 'greeting')).toBe(false)
    })
  })
})
