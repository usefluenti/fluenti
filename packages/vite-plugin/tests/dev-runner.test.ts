import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runExtractCompile, createDebouncedRunner, resolveCliBin } from '../src/dev-runner'

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}))

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    existsSync: vi.fn((p: string) => {
      // Simulate CLI binary existing at /project/node_modules/.bin/fluenti
      if (typeof p === 'string' && p.includes('node_modules/.bin/fluenti')) return true
      return false
    }),
  }
})

// Mock node:module for compileOnly mode (createRequire → require('@fluenti/cli'))
const mockRunCompile = vi.fn(() => Promise.resolve())
vi.mock('node:module', async () => {
  const actual = await vi.importActual<typeof import('node:module')>('node:module')
  return {
    ...actual,
    createRequire: vi.fn(() => {
      const req = vi.fn(() => ({ runCompile: mockRunCompile }))
      return req
    }),
  }
})

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'

const mockExecFile = vi.mocked(execFile)
const mockExistsSync = vi.mocked(existsSync)

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  // Re-apply default mock for existsSync
  mockExistsSync.mockImplementation((p: unknown) => {
    if (typeof p === 'string' && p.includes('node_modules/.bin/fluenti')) return true
    return false
  })
  mockRunCompile.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

function simulateExecFileSuccess(): void {
  mockExecFile.mockImplementation((_file, _args, _opts, cb) => {
    const callback = cb as (err: Error | null, stdout: string, stderr: string) => void
    callback(null, '', '')
    return undefined as never
  })
}

function simulateExecFileFailure(msg = 'compile error'): void {
  mockExecFile.mockImplementation((_file, _args, _opts, cb) => {
    const callback = cb as (err: Error | null, stdout: string, stderr: string) => void
    callback(new Error(msg), '', msg)
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
  describe('compileOnly mode (in-process)', () => {
    it('calls runCompile from @fluenti/cli (named export)', async () => {
      await runExtractCompile({ cwd: '/project', compileOnly: true })

      expect(mockRunCompile).toHaveBeenCalledWith('/project')
      expect(mockExecFile).not.toHaveBeenCalled()
    })

    it('calls onSuccess when compile succeeds', async () => {
      const onSuccess = vi.fn()

      await runExtractCompile({ cwd: '/project', compileOnly: true, onSuccess })

      expect(onSuccess).toHaveBeenCalledOnce()
    })

    it('calls onError when compile fails', async () => {
      mockRunCompile.mockRejectedValue(new Error('compile error'))
      const onError = vi.fn()

      await runExtractCompile({ cwd: '/project', compileOnly: true, onError })

      expect(onError).toHaveBeenCalledOnce()
      expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error)
    })

    it('throws when throwOnError is true and compile fails', async () => {
      mockRunCompile.mockRejectedValue(new Error('compile error'))

      await expect(
        runExtractCompile({ cwd: '/project', compileOnly: true, throwOnError: true }),
      ).rejects.toThrow('compile error')
    })
  })

  describe('dev mode (execFile fallback)', () => {
    it('calls execFile with resolved bin path, args array, and cwd', async () => {
      simulateExecFileSuccess()

      await runExtractCompile({ cwd: '/project' })

      expect(mockExecFile).toHaveBeenCalledWith(
        expect.stringContaining('node_modules/.bin/fluenti'),
        ['extract'],
        { cwd: '/project' },
        expect.any(Function),
      )
      expect(mockExecFile).toHaveBeenCalledWith(
        expect.stringContaining('node_modules/.bin/fluenti'),
        ['compile'],
        { cwd: '/project' },
        expect.any(Function),
      )
    })

    it('calls onSuccess when exec succeeds', async () => {
      simulateExecFileSuccess()
      const onSuccess = vi.fn()

      await runExtractCompile({ cwd: '/project', onSuccess })

      expect(onSuccess).toHaveBeenCalledOnce()
    })

    it('calls onError when exec fails', async () => {
      simulateExecFileFailure('bad things')
      const onError = vi.fn()

      await runExtractCompile({ cwd: '/project', onError })

      expect(onError).toHaveBeenCalledOnce()
      expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error)
    })

    it('rejects the promise when throwOnError is true', async () => {
      simulateExecFileFailure('compile error')

      await expect(
        runExtractCompile({ cwd: '/project', throwOnError: true }),
      ).rejects.toThrow('compile error')
    })

    it('does not call onError or warn when throwOnError is true', async () => {
      simulateExecFileFailure('compile error')
      const onError = vi.fn()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await expect(
        runExtractCompile({ cwd: '/project', onError, throwOnError: true }),
      ).rejects.toThrow()

      expect(onError).not.toHaveBeenCalled()
      expect(warnSpy).not.toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('skips gracefully when CLI is not installed', async () => {
      mockExistsSync.mockReturnValue(false)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await runExtractCompile({ cwd: '/project' })

      expect(mockExecFile).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('CLI not found'))
      warnSpy.mockRestore()
    })
  })
})

describe('createDebouncedRunner', () => {
  it('debounces multiple rapid calls into one execution', async () => {
    simulateExecFileSuccess()

    const run = createDebouncedRunner({ cwd: '/project' }, 100)
    run()
    run()
    run()

    // Not called yet — still in debounce window
    expect(mockExecFile).not.toHaveBeenCalled()

    // Advance past debounce
    await vi.advanceTimersByTimeAsync(100)

    // execFile is called twice per run: extract then compile
    expect(mockExecFile).toHaveBeenCalledTimes(2)
  })

  it('marks pendingRerun if called while running', async () => {
    // Make execFile async — resolve via captured callback
    let resolveExec!: () => void
    mockExecFile.mockImplementation((_file, _args, _opts, cb) => {
      const callback = cb as (err: Error | null, stdout: string, stderr: string) => void
      resolveExec = () => callback(null, '', '')
      return undefined as never
    })

    const run = createDebouncedRunner({ cwd: '/project' }, 50)

    // Trigger first run
    run()
    await vi.advanceTimersByTimeAsync(50)
    // First execFile call is for 'extract'
    expect(mockExecFile).toHaveBeenCalledOnce()

    // While first run is still going (extract not yet resolved), trigger another
    run()
    await vi.advanceTimersByTimeAsync(50)

    // Second run hasn't happened yet because first is still running
    expect(mockExecFile).toHaveBeenCalledOnce()

    // Complete extract — triggers compile execFile call
    resolveExec()
    await vi.advanceTimersByTimeAsync(0) // let microtasks flush
    expect(mockExecFile).toHaveBeenCalledTimes(2) // extract + compile

    // Complete compile — finishes first run, triggers pending rerun
    resolveExec()
    await vi.advanceTimersByTimeAsync(0) // let microtasks flush

    // Now the rerun should be scheduled
    await vi.advanceTimersByTimeAsync(50)
    // 2 calls from first run (extract + compile) + 1 from second run (extract)
    expect(mockExecFile).toHaveBeenCalledTimes(3)

    // Complete second run's extract
    resolveExec()
    await vi.advanceTimersByTimeAsync(0)
    expect(mockExecFile).toHaveBeenCalledTimes(4) // + compile from second run
  })
})
