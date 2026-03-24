import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runExtractCompile, createDebouncedRunner, resolveCliBin } from '../src/dev-runner'

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}))

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    existsSync: vi.fn((p: string) => {
      if (typeof p === 'string' && p.includes('node_modules/.bin/fluenti')) return true
      return false
    }),
  }
})

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

import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'

const mockExec = vi.mocked(exec)
const mockExistsSync = vi.mocked(existsSync)

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  mockExistsSync.mockImplementation((p: unknown) => {
    if (typeof p === 'string' && p.includes('node_modules/.bin/fluenti')) return true
    return false
  })
  mockRunCompile.mockResolvedValue(undefined)
  mockRunExtract.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

function simulateExecSuccess(): void {
  mockExec.mockImplementation((_cmd, _opts, cb) => {
    const callback = cb as (err: Error | null, stdout: string, stderr: string) => void
    callback(null, '', '')
    return undefined as never
  })
}

describe('resolveCliBin', () => {
  it('returns bin path when found', () => {
    expect(resolveCliBin('/project')).toContain('node_modules/.bin/fluenti')
  })

  it('returns null when not found', () => {
    mockExistsSync.mockReturnValue(false)
    expect(resolveCliBin('/project')).toBeNull()
  })
})

describe('runExtractCompile', () => {
  it('calls runCompile in compileOnly mode (named export)', async () => {
    await runExtractCompile({ cwd: '/project', compileOnly: true })
    expect(mockRunCompile).toHaveBeenCalledWith('/project')
    expect(mockExec).not.toHaveBeenCalled()
  })

  it('runs in-process extract+compile when @fluenti/cli is available', async () => {
    await runExtractCompile({ cwd: '/project' })
    expect(mockRunExtract).toHaveBeenCalledWith('/project')
    expect(mockRunCompile).toHaveBeenCalled()
    expect(mockExec).not.toHaveBeenCalled()
  })

  it('shells out when @fluenti/cli is not installed', async () => {
    const { createRequire } = await import('node:module')
    vi.mocked(createRequire).mockImplementationOnce(() => {
      const req = vi.fn(() => { throw Object.assign(new Error("Cannot find module '@fluenti/cli'"), { code: 'MODULE_NOT_FOUND' }) })
      return req as unknown as ReturnType<typeof createRequire>
    })
    simulateExecSuccess()
    await runExtractCompile({ cwd: '/project' })
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('fluenti extract'),
      { cwd: '/project' },
      expect.any(Function),
    )
  })

  it('surfaces error when @fluenti/cli is available but extract fails', async () => {
    mockRunExtract.mockRejectedValueOnce(new Error('ICU syntax error'))
    const onError = vi.fn()
    await runExtractCompile({ cwd: '/project', onError })
    // Error should be surfaced via onError, NOT silently fallen through to shell-out
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'ICU syntax error' }))
    expect(mockExec).not.toHaveBeenCalled()
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
