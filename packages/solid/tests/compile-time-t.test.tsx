import { describe, expect, it } from 'vitest'
import { t } from '../src'

describe('compile-time t export', () => {
  it('throws a compile-time-only error at runtime', () => {
    expect(() => t({ message: 'Hello' })).toThrow(
      "[fluenti] `t` imported from '@fluenti/solid' is a compile-time API. " +
        'Use it only with the Fluenti build transform inside a component or custom hook. ' +
        'For runtime lookups, use useI18n().t(...).',
    )
  })
})
