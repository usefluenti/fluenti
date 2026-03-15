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
})
