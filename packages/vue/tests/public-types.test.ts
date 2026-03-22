import { describe, expectTypeOf, it } from 'vitest'
import type {
  FluentiDateTimeProps,
  FluentiNumberProps,
  FluentiPluralProps,
  FluentiSelectProps,
  FluentiTransProps,
} from '../src'

describe('public type exports', () => {
  it('exports Vue component prop types from the package entrypoint', () => {
    expectTypeOf<FluentiTransProps>().toMatchTypeOf<{
      id?: string
      context?: string
      comment?: string
      tag?: string
    }>()

    expectTypeOf<FluentiPluralProps['value']>().toEqualTypeOf<number>()
    expectTypeOf<FluentiPluralProps['offset']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<FluentiSelectProps['options']>().toEqualTypeOf<Record<string, string> | undefined>()
    expectTypeOf<FluentiDateTimeProps['value']>().toEqualTypeOf<number | Date>()
    expectTypeOf<FluentiNumberProps['value']>().toEqualTypeOf<number>()
  })
})
