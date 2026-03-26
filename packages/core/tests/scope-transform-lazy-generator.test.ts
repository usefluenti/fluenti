import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('scopeTransform lazy generator loading', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.doUnmock('node:module')
  })

  it('does not require @babel/generator during module import', async () => {
    const requireSpy = vi.fn(() => {
      throw new Error('generator loaded eagerly')
    })

    vi.doMock('node:module', () => ({
      createRequire: () => requireSpy,
    }))

    await import('../src/scope-transform')

    expect(requireSpy).not.toHaveBeenCalled()
  })

  it('falls back to original code when @babel/generator throws during code generation', async () => {
    const codegen = await import('../src/scope-codegen')
    const { scopeTransform } = await import('../src/scope-transform')

    vi.spyOn(codegen, 'getGenerateCode').mockReturnValue((() => {
      throw new Error('generator boom')
    }) as never)

    const code = `
import { useI18n } from '@fluenti/react'
function App() {
  const { t } = useI18n()
  const msg = t\`Hello\`
}
`
    // Should not throw — falls back to original code
    const result = scopeTransform(code, { framework: 'react' })
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })
})
