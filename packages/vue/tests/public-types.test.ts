import { describe, expectTypeOf, it } from 'vitest'
import type {
  DateTimeProps,
  NumberFormatProps,
  PluralProps,
  SelectProps,
  TransProps,
} from '../src'

describe('public type exports', () => {
  it('exports Vue component prop types from the package entrypoint', () => {
    expectTypeOf<TransProps>().toMatchTypeOf<{
      id?: string
      context?: string
      comment?: string
      tag?: string
    }>()

    expectTypeOf<PluralProps['value']>().toEqualTypeOf<number>()
    expectTypeOf<PluralProps['offset']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<SelectProps['options']>().toEqualTypeOf<Record<string, string> | undefined>()
    expectTypeOf<DateTimeProps['value']>().toEqualTypeOf<number | Date>()
    expectTypeOf<NumberFormatProps['value']>().toEqualTypeOf<number>()
  })
})
