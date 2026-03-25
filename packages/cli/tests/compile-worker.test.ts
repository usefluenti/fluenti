import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock worker_threads BEFORE importing compile-worker so the top-level
// parentPort!.on() call uses our mock instead of a real parentPort.
vi.mock('node:worker_threads', () => {
  const mockParentPort = {
    on: vi.fn(),
    postMessage: vi.fn(),
  }
  return { parentPort: mockParentPort }
})

// Mock compile so we can force it to throw
vi.mock('../src/compile', () => ({
  compileCatalog: vi.fn(),
}))

import { parentPort } from 'node:worker_threads'
import { compileCatalog } from '../src/compile'

describe('compile-worker', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    // Re-import so the top-level side-effect re-runs with fresh mocks
    await import('../src/compile-worker')
  })

  it('posts error response when compileCatalog throws', () => {
    vi.mocked(compileCatalog).mockImplementationOnce(() => {
      throw new Error('ICU parse error: unexpected token')
    })

    // Retrieve the handler registered by compile-worker
    const mockOn = (parentPort as unknown as { on: ReturnType<typeof vi.fn> }).on
    const messageHandler = mockOn.mock.calls[0]?.[1] as (req: unknown) => void

    messageHandler({ locale: 'ja', catalog: {}, allIds: [], sourceLocale: 'en' })

    const mockPostMessage = (parentPort as unknown as { postMessage: ReturnType<typeof vi.fn> }).postMessage
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'ja',
        error: 'ICU parse error: unexpected token',
        code: '',
      }),
    )
  })

  it('posts success response when compileCatalog succeeds', () => {
    vi.mocked(compileCatalog).mockReturnValueOnce({
      code: 'export default {}',
      stats: { compiled: 1, missing: [] },
    })

    const mockOn = (parentPort as unknown as { on: ReturnType<typeof vi.fn> }).on
    const messageHandler = mockOn.mock.calls[0]?.[1] as (req: unknown) => void

    messageHandler({ locale: 'ja', catalog: {}, allIds: ['hello'], sourceLocale: 'en' })

    const mockPostMessage = (parentPort as unknown as { postMessage: ReturnType<typeof vi.fn> }).postMessage
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'ja',
        code: 'export default {}',
        stats: { compiled: 1, missing: [] },
      }),
    )
    // No error field on success
    expect(mockPostMessage.mock.calls[0][0]).not.toHaveProperty('error')
  })

  it('posts error response when compileCatalog throws a non-Error value', () => {
    vi.mocked(compileCatalog).mockImplementationOnce(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'string error'
    })

    const mockOn = (parentPort as unknown as { on: ReturnType<typeof vi.fn> }).on
    const messageHandler = mockOn.mock.calls[0]?.[1] as (req: unknown) => void

    messageHandler({ locale: 'en', catalog: {}, allIds: [], sourceLocale: 'en' })

    const mockPostMessage = (parentPort as unknown as { postMessage: ReturnType<typeof vi.fn> }).postMessage
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'en',
        error: 'string error',
      }),
    )
  })
})
