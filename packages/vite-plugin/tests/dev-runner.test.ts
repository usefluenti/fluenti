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
      // Simulate CLI binary existing at /project/node_modules/.bin/fluenti
      if (typeof p === 'string' && p.includes('node_modules/.bin/fluenti')) return true
      return false
    }),
  }
})

// Mock node:module for compileOnly mode (createRequire → resolve → dynamic import)
const mockRunCompile = vi.fn(() => Promise.resolve())
vi.mock('node:module', async () => {
  const actual = await vi.importActual<typeof import('node:module')>('node:module')
  return {
    ...actual,
    createRequire: vi.fn(() => ({
      resolve: vi.fn(() => '@fluenti/cli-mock-path'),
    })),
  }
})

// The dynamic import of the resolved path needs to be intercepted
vi.mock('@fluenti/cli-mock-path', () => ({
  runCompile: mockRunCompile,
}))

import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'

const mockExec = vi.mocked(exec)
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

function simulateExecSuccess(): void {
  mockExec.mockImplementation((_cmd, _opts, cb) => {
    const callback = cb as (err: Error | null, stdout: string, stderr: string) => void
    callback(null, '', '')
    return undefined as never
  })
}

function simulateExecFailure(msg = 'compile error'): void {
  mockExec.mockImplementation((_cmd, _opts, cb) => {
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
    it('calls runCompile from @fluenti/cli', async () => {
      await runExtractCompile({ cwd: '/project', compileOnly: true })

      expect(mockRunCompile).toHaveBeenCalledWith('/project')
      expect(mockExec).not.toHaveBeenCalled()
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

  describe('dev mode (shell-out)', () => {
    it('calls exec with resolved bin path and cwd', async () => {
      simulateExecSuccess()

      await runExtractCompile({ cwd: '/project' })

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('fluenti extract'),
        { cwd: '/project' },
        expect.any(Function),
      )
    })

    it('calls onSuccess when exec succeeds', async () => {
      simulateExecSuccess()
      const onSuccess = vi.fn()

      await runExtractCompile({ cwd: '/project', onSuccess })

      expect(onSuccess).toHaveBeenCalledOnce()
    })

    it('calls onError when exec fails', async () => {
      simulateExecFailure('bad things')
      const onError = vi.fn()

      await runExtractCompile({ cwd: '/project', onError })

      expect(onError).toHaveBeenCalledOnce()
      expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error)
    })

    it('rejects the promise when throwOnError is true', async () => {
      simulateExecFailure('compile error')

      await expect(
        runExtractCompile({ cwd: '/project', throwOnError: true }),
      ).rejects.toThrow('compile error')
    })

    it('does not call onError or warn when throwOnError is true', async () => {
      simulateExecFailure('compile error')
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

      expect(mockExec).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('CLI not found'))
      warnSpy.mockRestore()
    })
  })
})

describe('createDebouncedRunner', () => {
  it('debounces multiple rapid calls into one execution', async () => {
    simulateExecSuccess()

    const run = createDebouncedRunner({ cwd: '/project' }, 100)
    run()
    run()
    run()

    // Not called yet — still in debounce window
    expect(mockExec).not.toHaveBeenCalled()

    // Advance past debounce
    await vi.advanceTimersByTimeAsync(100)

    expect(mockExec).toHaveBeenCalledOnce()
  })

  it('marks pendingRerun if called while running', async () => {
    // Make exec async — resolve via captured callback
    let resolveExec!: () => void
    mockExec.mockImplementation((_cmd, _opts, cb) => {
      const callback = cb as (err: Error | null, stdout: string, stderr: string) => void
      resolveExec = () => callback(null, '', '')
      return undefined as never
    })

    const run = createDebouncedRunner({ cwd: '/project' }, 50)

    // Trigger first run
    run()
    await vi.advanceTimersByTimeAsync(50)
    expect(mockExec).toHaveBeenCalledOnce()

    // While first run is still going, trigger another
    run()
    await vi.advanceTimersByTimeAsync(50)

    // Second exec hasn't happened yet because first is still running
    expect(mockExec).toHaveBeenCalledOnce()

    // Complete first run — should trigger pending rerun
    resolveExec()
    await vi.advanceTimersByTimeAsync(0) // let microtasks flush

    // Now the rerun should be scheduled
    await vi.advanceTimersByTimeAsync(50)
    expect(mockExec).toHaveBeenCalledTimes(2)
  })
})
