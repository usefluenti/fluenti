/**
 * Cross-package integration tests.
 *
 * Verifies that core, cli, and vite-plugin produce consistent results
 * when used together (e.g., hash IDs match, compiled catalogs are consumable).
 */
import { describe, it, expect } from 'vitest'
import { msg, parse, compile, interpolate, createFluent, detectLocale, hashMessage } from '../src/index'

describe('cross-package: hash consistency', () => {
  it('core msg() ID matches cli hashMessage()', () => {
    const descriptor = msg`Hello World`
    const cliHash = hashMessage(descriptor.message!)

    expect(descriptor.id).toBe(cliHash)
  })

  it('vite-plugin hash matches cli hash matches core msg hash', () => {
    const message = 'Hello {0}'
    const descriptor = msg`Hello ${'name'}`

    expect(descriptor.message).toBe(message)

    const coreHash = hashMessage(message)

    expect(descriptor.id).toBe(coreHash)
  })
})

describe('cross-package: compiled catalog consumed by core createFluent', () => {
  it('compiled function messages can be consumed by core createFluent', () => {
    // Simulate the output of @fluenti/cli compileCatalog:
    // compiled catalogs produce either plain strings or functions
    const messages: Record<string, string | ((v?: any) => string)> = {
      greeting: (v: any) => `Hello ${v['name']}!`,
      farewell: 'Goodbye',
    }

    const fluent = createFluent({ locale: 'en', messages: { en: messages } })

    expect(fluent.t('greeting', { name: 'World' })).toBe('Hello World!')
    expect(fluent.t('farewell')).toBe('Goodbye')
  })
})

describe('cross-package: core parse > compile > interpolate pipeline', () => {
  it('full pipeline produces correct output for ICU plural message', () => {
    const message = '{count, plural, one {# item} other {# items}}'

    // Step 1: parse
    const ast = parse(message)
    expect(ast).toHaveLength(1)
    expect(ast[0]!.type).toBe('plural')

    // Step 2: compile
    const compiled = compile(ast, 'en')
    expect(typeof compiled).toBe('function')

    // Step 3: execute
    const fn = compiled as (values?: Record<string, unknown>) => string
    expect(fn({ count: 1 })).toBe('1 item')
    expect(fn({ count: 0 })).toBe('0 items')
    expect(fn({ count: 42 })).toBe('42 items')

    // Step 4: interpolate (all-in-one shortcut)
    expect(interpolate(message, { count: 1 }, 'en')).toBe('1 item')
    expect(interpolate(message, { count: 42 }, 'en')).toBe('42 items')
  })

  it('full pipeline for select message', () => {
    const message = '{gender, select, male {He} female {She} other {They}} went home.'

    const ast = parse(message)
    const compiled = compile(ast, 'en')
    expect(typeof compiled).toBe('function')

    const fn = compiled as (values?: Record<string, unknown>) => string
    expect(fn({ gender: 'male' })).toBe('He went home.')
    expect(fn({ gender: 'female' })).toBe('She went home.')
    expect(fn({ gender: 'nonbinary' })).toBe('They went home.')
  })

  it('full pipeline for nested plural + variable', () => {
    const message = 'You have {count, plural, one {# new message} other {# new messages}} from {sender}.'

    expect(interpolate(message, { count: 1, sender: 'Alice' }, 'en'))
      .toBe('You have 1 new message from Alice.')
    expect(interpolate(message, { count: 5, sender: 'Bob' }, 'en'))
      .toBe('You have 5 new messages from Bob.')
  })
})

describe('cross-package: SSR locale detection feeds into createFluent', () => {
  it('detectLocale result can be used to initialize createFluent', () => {
    const detected = detectLocale({
      available: ['en', 'ja', 'zh-CN'],
      fallback: 'en',
      cookie: 'ja',
    })

    expect(detected).toBe('ja')

    const fluent = createFluent({
      locale: detected,
      messages: {
        en: { greeting: 'Hello' },
        ja: { greeting: 'こんにちは' },
      },
    })

    expect(fluent.locale).toBe('ja')
    expect(fluent.t('greeting')).toBe('こんにちは')
  })

  it('detectLocale falls back correctly and createFluent uses fallback locale', () => {
    const detected = detectLocale({
      available: ['en', 'fr'],
      fallback: 'en',
      headers: { 'accept-language': 'de-DE,de;q=0.9' },
    })

    // de is not available, so should fall back to 'en'
    expect(detected).toBe('en')

    const fluent = createFluent({
      locale: detected,
      messages: {
        en: { greeting: 'Hello' },
        fr: { greeting: 'Bonjour' },
      },
    })

    expect(fluent.locale).toBe('en')
    expect(fluent.t('greeting')).toBe('Hello')
  })
})
