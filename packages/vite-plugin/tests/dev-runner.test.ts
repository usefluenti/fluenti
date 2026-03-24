import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runExtractCompile, createDebouncedRunner } from '../src/dev-runner'
import { createRequire } from 'node:module'

// Mock node:module - provide both runExtract and runCompile
const mockRunExtract = vi.fn(() => Promise.resolve())
const mockRunCompile = vi.fn(() => Promise.resolve())

vi.mock('node:module', async () => {
  const actual = await vi.importActual<typeof import('node:module')>('node:module')
  return {
    ...actual,
    createRequire: vi.fn(() => {
      return vi.fn(() => ({ runExtract: mockRunExtract, runCompile: mockRunCompile }))
    }),
  }
})

function resetCreateRequireMock(): void {
  vi.mocked(createRequire).mockImplementation(() => {
    return vi.fn(() => ({ runExtract: mockRunExtract, runCompile: mockRunCompile }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  mockRunExtract.mockResolvedValue(undefined)
  mockRunCompile.mockResolvedValue(undefined)
  resetCreateRequireMock()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('runExtractCompile', () => {
  describe('compileOnly mode (in-process)', () => {
    it('calls runCompile from @fluenti/cli (named export)', async () => {
      await runExtractCompile({ cwd: '/project', compileOnly: true })

      expect(mockRunCompile).toHaveBeenCalledWith('/project')
      expect(mockRunExtract).not.toHaveBeenCalled()
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

  describe('dev mode (in-process extract + compile)', () => {
    it('calls runExtract then runCompile from @fluenti/cli', async () => {
      await runExtractCompile({ cwd: '/project' })

      expect(mockRunExtract).toHaveBeenCalledWith('/project')
      expect(mockRunCompile).toHaveBeenCalledWith('/project', { parallel: undefined })
    })

    it('passes parallelCompile flag to runCompile', async () => {
      await runExtractCompile({ cwd: '/project', parallelCompile: true })

      expect(mockRunCompile).toHaveBeenCalledWith('/project', { parallel: true })
    })

    it('calls onSuccess when extract+compile succeeds', async () => {
      const onSuccess = vi.fn()

      await runExtractCompile({ cwd: '/project', onSuccess })

      expect(onSuccess).toHaveBeenCalledOnce()
    })

    it('calls onAfterCompile then onSuccess when succeeds', async () => {
      const order: string[] = []
      const onAfterCompile = vi.fn(() => { order.push('after') })
      const onSuccess = vi.fn(() => { order.push('success') })

      await runExtractCompile({ cwd: '/project', onAfterCompile, onSuccess })

      expect(order).toEqual(['after', 'success'])
    })

    it('calls onError when extract+compile fails', async () => {
      mockRunExtract.mockRejectedValue(new Error('extract failed'))
      const onError = vi.fn()

      await runExtractCompile({ cwd: '/project', onError })

      expect(onError).toHaveBeenCalledOnce()
      expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error)
    })

    it('rejects the promise when throwOnError is true', async () => {
      mockRunExtract.mockRejectedValue(new Error('extract failed'))

      await expect(
        runExtractCompile({ cwd: '/project', throwOnError: true }),
      ).rejects.toThrow('extract failed')
    })

    it('shows install guide when @fluenti/cli is not loadable', async () => {
      vi.mocked(createRequire).mockReturnValue(vi.fn(() => {
        throw new Error('Cannot find module @fluenti/cli')
      }))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await runExtractCompile({ cwd: '/project' })

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('@fluenti/cli'))
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('pnpm add -D @fluenti/cli'))
      warnSpy.mockRestore()
    })

    it('throws install guide message when throwOnError is true and CLI not loadable', async () => {
      vi.mocked(createRequire).mockReturnValue(vi.fn(() => {
        throw new Error('Cannot find module @fluenti/cli')
      }))

      await expect(
        runExtractCompile({ cwd: '/project', throwOnError: true }),
      ).rejects.toThrow('@fluenti/cli')
    })

    it('skips run when onBeforeCompile returns false', async () => {
      await runExtractCompile({ cwd: '/project', onBeforeCompile: () => false })

      expect(mockRunExtract).not.toHaveBeenCalled()
      expect(mockRunCompile).not.toHaveBeenCalled()
    })
  })
})

describe('createDebouncedRunner', () => {
  it('debounces multiple rapid calls into one execution', async () => {
    const run = createDebouncedRunner({ cwd: '/project' }, 100)
    run()
    run()
    run()

    // Not called yet — still in debounce window
    expect(mockRunExtract).not.toHaveBeenCalled()

    // Advance past debounce
    await vi.advanceTimersByTimeAsync(100)

    expect(mockRunExtract).toHaveBeenCalledTimes(1)
    expect(mockRunCompile).toHaveBeenCalledTimes(1)
  })

  it('marks pendingRerun if called while running', async () => {
    // Make runExtract async — resolve via captured callback
    let resolveExtract!: () => void
    mockRunExtract.mockImplementation(
      () => new Promise<void>(res => { resolveExtract = res }),
    )

    const run = createDebouncedRunner({ cwd: '/project' }, 50)

    // Trigger first run
    run()
    await vi.advanceTimersByTimeAsync(50)
    // runExtract started (not yet resolved)
    expect(mockRunExtract).toHaveBeenCalledTimes(1)
    expect(mockRunCompile).not.toHaveBeenCalled()

    // While first run is still in-progress, trigger another
    run()
    await vi.advanceTimersByTimeAsync(50)

    // Second run hasn't started because first is still running
    expect(mockRunExtract).toHaveBeenCalledTimes(1)

    // Complete first extract → runCompile starts (which resolves immediately)
    resolveExtract()
    await vi.advanceTimersByTimeAsync(0) // flush microtasks

    expect(mockRunCompile).toHaveBeenCalledTimes(1)
    // First run finishes; pending rerun is scheduled
    await vi.advanceTimersByTimeAsync(50)
    expect(mockRunExtract).toHaveBeenCalledTimes(2)

    // Complete second run
    resolveExtract()
    await vi.advanceTimersByTimeAsync(0)
    expect(mockRunCompile).toHaveBeenCalledTimes(2)
  })
})
