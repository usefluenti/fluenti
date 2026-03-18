import { afterEach, describe, expect, it, vi } from 'vitest'

describe('scopeTransform lazy generator loading', () => {
  afterEach(() => {
    vi.resetModules()
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
})
