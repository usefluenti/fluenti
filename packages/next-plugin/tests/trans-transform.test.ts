import { describe, it, expect } from 'vitest'
import { transformTransComponents } from '../src/trans-transform'

describe('transformTransComponents (re-export from core)', () => {
  it('is exported as a function', () => {
    expect(typeof transformTransComponents).toBe('function')
  })

  it('transforms plain text children', () => {
    const code = '<Trans>Hello world</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__id=')
    expect(result.code).toContain('__message="Hello world"')
  })

  it('returns unchanged when no Trans present', () => {
    const code = 'const x = 1'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })
})
