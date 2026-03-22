import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AIProvider } from '../src/ai-provider'

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}))

vi.mock('node:timers/promises', () => ({
  setTimeout: vi.fn(() => Promise.resolve()),
}))

import { execFile } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { invokeAI } from '../src/ai-provider'

function mockExecFile(impl: (...args: unknown[]) => unknown) {
  const mocked = vi.mocked(execFile)
  mocked.mockImplementation((_cmd, _args, _opts, callback) => {
    try {
      const result = impl(_cmd, _args, _opts)
      if (result instanceof Promise) {
        result.then(
          (val) => callback?.(null, val as never, '' as never),
          (err) => callback?.(err as Error, '' as never, '' as never),
        )
      } else {
        callback?.(null, result as never, '' as never)
      }
    } catch (err) {
      callback?.(err as Error, '' as never, '' as never)
    }
    return {} as never
  })
}

function mockExecFileSequence(results: Array<{ stdout?: string; error?: Error }>) {
  const mocked = vi.mocked(execFile)
  let callIndex = 0
  mocked.mockImplementation((_cmd, _args, _opts, callback) => {
    const entry = results[callIndex++]
    if (entry?.error) {
      callback?.(entry.error, '' as never, '' as never)
    } else {
      callback?.(null, { stdout: entry?.stdout ?? '', stderr: '' } as never, '' as never)
    }
    return {} as never
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('invokeAI', () => {
  it('claude provider calls claude -p <prompt> and returns stdout', async () => {
    mockExecFile(() => ({ stdout: 'translated text', stderr: '' }))

    const result = await invokeAI({ provider: 'claude', prompt: 'translate this' })

    expect(result.stdout).toBe('translated text')
    expect(vi.mocked(execFile)).toHaveBeenCalledWith(
      'claude',
      ['-p', 'translate this'],
      expect.objectContaining({ maxBuffer: 10 * 1024 * 1024 }),
      expect.any(Function),
    )
  })

  it('codex provider calls codex -p <prompt> --full-auto and returns stdout', async () => {
    mockExecFile(() => ({ stdout: 'codex output', stderr: '' }))

    const result = await invokeAI({ provider: 'codex', prompt: 'translate this' })

    expect(result.stdout).toBe('codex output')
    expect(vi.mocked(execFile)).toHaveBeenCalledWith(
      'codex',
      ['-p', 'translate this', '--full-auto'],
      expect.objectContaining({ maxBuffer: 10 * 1024 * 1024 }),
      expect.any(Function),
    )
  })

  it('ENOENT error throws with claude install instructions', async () => {
    const error = Object.assign(new Error('not found'), { code: 'ENOENT' })
    mockExecFile(() => { throw error })

    await expect(invokeAI({ provider: 'claude', prompt: 'test' }))
      .rejects.toThrow('npm install -g @anthropic-ai/claude-code')
  })

  it('ENOENT error throws with codex install instructions', async () => {
    const error = Object.assign(new Error('not found'), { code: 'ENOENT' })
    mockExecFile(() => { throw error })

    await expect(invokeAI({ provider: 'codex', prompt: 'test' }))
      .rejects.toThrow('npm install -g @openai/codex')
  })

  it('non-ENOENT error retries up to maxRetries times then throws', async () => {
    const error = new Error('connection failed')
    mockExecFile(() => { throw error })

    await expect(invokeAI({ provider: 'claude', prompt: 'test', maxRetries: 2, initialDelayMs: 10 }))
      .rejects.toThrow('connection failed')

    // 1 initial + 2 retries = 3 calls
    expect(vi.mocked(execFile)).toHaveBeenCalledTimes(3)
    // sleep called between retries: 2 times
    expect(vi.mocked(sleep)).toHaveBeenCalledTimes(2)
  })

  it('successful retry after transient failure returns correct attempt count', async () => {
    mockExecFileSequence([
      { error: new Error('transient') },
      { stdout: 'success on retry' },
    ])

    const result = await invokeAI({ provider: 'claude', prompt: 'test', initialDelayMs: 10 })

    expect(result.stdout).toBe('success on retry')
    expect(result.attempts).toBe(2)
  })

  it('default maxRetries is 3', async () => {
    const error = new Error('fail')
    mockExecFile(() => { throw error })

    await expect(invokeAI({ provider: 'claude', prompt: 'test', initialDelayMs: 10 }))
      .rejects.toThrow('fail')

    // 1 initial + 3 retries = 4 calls
    expect(vi.mocked(execFile)).toHaveBeenCalledTimes(4)
  })

  it('custom maxRetries respected', async () => {
    const error = new Error('fail')
    mockExecFile(() => { throw error })

    await expect(invokeAI({ provider: 'claude', prompt: 'test', maxRetries: 5, initialDelayMs: 10 }))
      .rejects.toThrow('fail')

    // 1 initial + 5 retries = 6 calls
    expect(vi.mocked(execFile)).toHaveBeenCalledTimes(6)
  })

  it('returns attempts=1 on first-try success', async () => {
    mockExecFile(() => ({ stdout: 'ok', stderr: '' }))

    const result = await invokeAI({ provider: 'claude', prompt: 'test' })

    expect(result.attempts).toBe(1)
  })

  it('non-ENOENT error retries then throws lastError', async () => {
    const error = new Error('permission denied')
    Object.assign(error, { code: 'EACCES' })
    mockExecFile(() => { throw error })

    await expect(invokeAI({ provider: 'claude', prompt: 'test', maxRetries: 1, initialDelayMs: 10 }))
      .rejects.toThrow('permission denied')

    // 1 initial + 1 retry = 2 calls
    expect(vi.mocked(execFile)).toHaveBeenCalledTimes(2)
  })

  it('maxRetries = 0 makes a single attempt then throws on failure', async () => {
    const error = new Error('fail once')
    mockExecFile(() => { throw error })

    await expect(invokeAI({ provider: 'claude', prompt: 'test', maxRetries: 0, initialDelayMs: 10 }))
      .rejects.toThrow('fail once')

    // Only 1 call (initial attempt, no retries)
    expect(vi.mocked(execFile)).toHaveBeenCalledTimes(1)
    // No sleep calls since there are no retries
    expect(vi.mocked(sleep)).not.toHaveBeenCalled()
  })
})
