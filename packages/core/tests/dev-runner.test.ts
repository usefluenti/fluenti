import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runExtractCompile, createDebouncedRunner } from '../src/dev-runner'

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}))

import { exec } from 'node:child_process'

const mockExec = vi.mocked(exec)

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
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

describe('runExtractCompile', () => {
  it('calls exec with correct command and cwd', async () => {
    simulateExecSuccess()

    await runExtractCompile({ cwd: '/project' })

    expect(mockExec).toHaveBeenCalledWith(
      'npx @fluenti/cli extract && npx @fluenti/cli compile',
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
