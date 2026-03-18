import { describe, it, expect } from 'vitest'
import { scopeTransform } from '../src/scope-transform'

describe('scopeTransform (re-export from core)', () => {
  it('is exported as a function', () => {
    expect(typeof scopeTransform).toBe('function')
  })

  it('transforms t`Hello` when t comes from useI18n()', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = t\`Hello\`
`
    const result = scopeTransform(code, { framework: 'react' })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("t({ id:")
    expect(result.code).toContain("message: 'Hello' })")
  })

  it('returns unchanged when no useI18n import', () => {
    const code = `const x = 1`
    const result = scopeTransform(code, { framework: 'react' })
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })
})
