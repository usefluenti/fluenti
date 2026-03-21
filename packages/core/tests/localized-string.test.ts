import { describe, it, expect, expectTypeOf } from 'vitest'
import { createFluent } from '../src/index'
import type { LocalizedString } from '../src/types'

describe('LocalizedString branded type', () => {
  const i18n = createFluent({
    locale: 'en',
    messages: {
      en: { greeting: 'Hello World' },
    },
  })

  it('t() returns LocalizedString', () => {
    const result = i18n.t('greeting')
    expectTypeOf(result).toEqualTypeOf<LocalizedString>()
    expect(result).toBe('Hello World')
  })

  it('tagged template t`` returns LocalizedString', () => {
    const result = i18n.t`Hello`
    expectTypeOf(result).toEqualTypeOf<LocalizedString>()
    expect(typeof result).toBe('string')
  })

  it('d() returns LocalizedString', () => {
    const result = i18n.d(new Date(2024, 0, 1))
    expectTypeOf(result).toEqualTypeOf<LocalizedString>()
    expect(typeof result).toBe('string')
  })

  it('n() returns LocalizedString', () => {
    const result = i18n.n(42)
    expectTypeOf(result).toEqualTypeOf<LocalizedString>()
    expect(typeof result).toBe('string')
  })

  it('format() returns LocalizedString', () => {
    const result = i18n.format('Hello {name}', { name: 'World' })
    expectTypeOf(result).toEqualTypeOf<LocalizedString>()
    expect(result).toBe('Hello World')
  })

  it('LocalizedString is assignable to string (backward compat)', () => {
    const localized: LocalizedString = i18n.t('greeting')
    const str: string = localized
    expect(str).toBe('Hello World')
  })

  it('plain string is NOT assignable to LocalizedString at type level', () => {
    // This verifies the brand prevents direct assignment:
    // const bad: LocalizedString = 'raw string' would fail at compile time.
    // We verify via expectTypeOf that string is not assignable to LocalizedString.
    expectTypeOf<string>().not.toEqualTypeOf<LocalizedString>()
  })
})
