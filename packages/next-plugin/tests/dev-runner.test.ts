import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runExtractCompile, createDebouncedRunner } from '../src/dev-runner'

// Mock node:module for compileOnly / dev mode (createRequire → require('@fluenti/cli'))
const mockRunCompile = vi.fn(() => Promise.resolve())
const mockRunExtract = vi.fn(() => Promise.resolve())
vi.mock('node:module', async () => {
  const actual = await vi.importActual<typeof import('node:module')>('node:module')
  return {
    ...actual,
    createRequire: vi.fn(() => {
      const req = vi.fn(() => ({ runCompile: mockRunCompile, runExtract: mockRunExtract }))
      return req
    }),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  mockRunCompile.mockResolvedValue(undefined)
  mockRunExtract.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('runExtractCompile', () => {
  it('calls runCompile in compileOnly mode (named export)', async () => {
    await runExtractCompile({ cwd: '/project', compileOnly: true })
    expect(mockRunCompile).toHaveBeenCalledWith('/project')
  })

  it('runs in-process extract+compile when @fluenti/cli is available', async () => {
    await runExtractCompile({ cwd: '/project' })
    expect(mockRunExtract).toHaveBeenCalledWith('/project')
    expect(mockRunCompile).toHaveBeenCalled()
  })

  it('shows install guide when @fluenti/cli is not installed', async () => {
    const { createRequire } = await import('node:module')
    vi.mocked(createRequire).mockImplementationOnce(() => {
      const req = vi.fn(() => { throw Object.assign(new Error("Cannot find module '@fluenti/cli'"), { code: 'MODULE_NOT_FOUND' }) })
      return req as unknown as ReturnType<typeof createRequire>
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await runExtractCompile({ cwd: '/project' })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('pnpm add -D @fluenti/cli'))
    warnSpy.mockRestore()
  })

  it('throws with install guide when throwOnError is set and CLI missing', async () => {
    const { createRequire } = await import('node:module')
    vi.mocked(createRequire).mockImplementationOnce(() => {
      const req = vi.fn(() => { throw Object.assign(new Error("Cannot find module '@fluenti/cli'"), { code: 'MODULE_NOT_FOUND' }) })
      return req as unknown as ReturnType<typeof createRequire>
    })
    await expect(runExtractCompile({ cwd: '/project', throwOnError: true }))
      .rejects.toThrow('pnpm add -D @fluenti/cli')
  })

  it('surfaces error when @fluenti/cli is available but extract fails', async () => {
    mockRunExtract.mockRejectedValueOnce(new Error('ICU syntax error'))
    const onError = vi.fn()
    await runExtractCompile({ cwd: '/project', onError })
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'ICU syntax error' }))
  })
})

describe('createDebouncedRunner', () => {
  it('debounces multiple rapid calls into one execution', async () => {
    const run = createDebouncedRunner({ cwd: '/project' }, 100)
    run()
    run()
    run()

    expect(mockRunExtract).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(100)
    // All three calls collapse into one in-process execution
    expect(mockRunExtract).toHaveBeenCalledOnce()
  })
})
