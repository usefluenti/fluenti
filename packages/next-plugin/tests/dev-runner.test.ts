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

// Mock node:module for compileOnly mode
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

  it('shells out in dev mode', async () => {
    simulateExecSuccess()
    await runExtractCompile({ cwd: '/project' })
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('fluenti extract'),
      { cwd: '/project' },
      expect.any(Function),
    )
  })
})

describe('createDebouncedRunner', () => {
  it('debounces multiple rapid calls into one execution', async () => {
    simulateExecSuccess()

    const run = createDebouncedRunner({ cwd: '/project' }, 100)
    run()
    run()
    run()

    expect(mockExec).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(100)
    expect(mockExec).toHaveBeenCalledOnce()
  })
})
