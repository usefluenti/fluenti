import { bench, describe } from 'vitest'
import { interpolate } from '../src/interpolate'
import { MESSAGES, VALUES, uniqueMessage, resetUniqueCounter } from './_helpers'

describe('interpolate', () => {
  // Warm up the cache for hit benchmarks
  interpolate(MESSAGES.plain, undefined, 'en')
  interpolate(MESSAGES.singleVar, VALUES.simple, 'en')
  interpolate(MESSAGES.pluralSimple, VALUES.plural, 'en')
  interpolate(MESSAGES.select, VALUES.select, 'en')

  describe('cache hit', () => {
    bench('static text', () => {
      interpolate(MESSAGES.plain, undefined, 'en')
    })

    bench('single variable', () => {
      interpolate(MESSAGES.singleVar, VALUES.simple, 'en')
    })

    bench('plural', () => {
      interpolate(MESSAGES.pluralSimple, VALUES.plural, 'en')
    })

    bench('select', () => {
      interpolate(MESSAGES.select, VALUES.select, 'en')
    })
  })

  describe('cache miss', () => {
    bench('unique messages (cold)', () => {
      interpolate(uniqueMessage(), VALUES.simple, 'en')
    })

    bench('batch 100 cold messages', () => {
      resetUniqueCounter()
      for (let i = 0; i < 100; i++) {
        interpolate(`Batch msg ${Date.now()}_${i} {name}`, VALUES.simple, 'en')
      }
    })
  })

  describe('cache eviction', () => {
    bench('501 unique messages (exceeds LRU_MAX=500)', () => {
      for (let i = 0; i < 501; i++) {
        interpolate(`Eviction test ${Date.now()}_${i} {name}`, VALUES.simple, 'en')
      }
    })
  })
})
