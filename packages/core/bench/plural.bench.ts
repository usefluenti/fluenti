import { bench, describe } from 'vitest'
import { resolvePlural, resolvePluralCategory } from '../src/plural'

const options2Forms = { one: [], other: [] }
const options6Forms = { zero: [], one: [], two: [], few: [], many: [], other: [] }
const optionsWithExact = { '=0': [], one: [], other: [] }

describe('plural', () => {
  describe('resolvePluralCategory across locales', () => {
    bench('en (2 forms) — count=1', () => {
      resolvePluralCategory(1, options2Forms, 'en')
    })

    bench('en (2 forms) — count=5', () => {
      resolvePluralCategory(5, options2Forms, 'en')
    })

    bench('ar (6 forms) — count=3', () => {
      resolvePluralCategory(3, options6Forms, 'ar')
    })

    bench('ar (6 forms) — count=100', () => {
      resolvePluralCategory(100, options6Forms, 'ar')
    })

    bench('ja (1 form) — count=1', () => {
      resolvePluralCategory(1, options2Forms, 'ja')
    })

    bench('pl (4 forms) — count=2', () => {
      resolvePluralCategory(2, { one: [], few: [], many: [], other: [] }, 'pl')
    })

    bench('pl (4 forms) — count=5', () => {
      resolvePluralCategory(5, { one: [], few: [], many: [], other: [] }, 'pl')
    })
  })

  describe('resolvePlural with exact match', () => {
    bench('exact =0 hit', () => {
      resolvePlural(0, optionsWithExact, 'en')
    })

    bench('exact miss → CLDR fallback', () => {
      resolvePlural(5, optionsWithExact, 'en')
    })
  })
})
