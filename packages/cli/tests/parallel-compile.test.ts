import { describe, expect, it, vi } from 'vitest'
import { parallelCompile } from '../src/parallel-compile'
import type { ParallelCompileTask } from '../src/parallel-compile'
import type { CatalogData } from '../src/catalog'

function makeCatalog(messages: Record<string, string>): CatalogData {
  const catalog: CatalogData = {}
  for (const [id, translation] of Object.entries(messages)) {
    catalog[id] = { message: id, translation }
  }
  return catalog
}

describe('parallelCompile', () => {
  it('returns empty array for no tasks', async () => {
    const results = await parallelCompile([])
    expect(results).toEqual([])
  })

  it('compiles single task in-process (no worker)', async () => {
    const catalog = makeCatalog({ Hello: 'こんにちは' })
    const tasks: ParallelCompileTask[] = [
      { locale: 'ja', catalog, allIds: ['Hello'], sourceLocale: 'en' },
    ]

    const results = await parallelCompile(tasks)
    expect(results).toHaveLength(1)
    expect(results[0]!.locale).toBe('ja')
    expect(results[0]!.code).toContain('こんにちは')
    expect(results[0]!.stats.compiled).toBe(1)
  })

  it('compiles multiple locales in parallel', async () => {
    const jaCatalog = makeCatalog({ Hello: 'こんにちは', World: '世界' })
    const zhCatalog = makeCatalog({ Hello: '你好', World: '世界' })
    const allIds = ['Hello', 'World']

    const tasks: ParallelCompileTask[] = [
      { locale: 'ja', catalog: jaCatalog, allIds, sourceLocale: 'en' },
      { locale: 'zh-CN', catalog: zhCatalog, allIds, sourceLocale: 'en' },
    ]

    const results = await parallelCompile(tasks)
    expect(results).toHaveLength(2)

    const locales = results.map((r) => r.locale).sort()
    expect(locales).toEqual(['ja', 'zh-CN'])

    const jaResult = results.find((r) => r.locale === 'ja')!
    expect(jaResult.code).toContain('こんにちは')
    expect(jaResult.stats.compiled).toBe(2)

    const zhResult = results.find((r) => r.locale === 'zh-CN')!
    expect(zhResult.code).toContain('你好')
    expect(zhResult.stats.compiled).toBe(2)
  })

  it('respects concurrency limit', async () => {
    const allIds = ['Hello']
    const tasks: ParallelCompileTask[] = Array.from({ length: 4 }, (_, i) => ({
      locale: `locale-${i}`,
      catalog: makeCatalog({ Hello: `Translation ${i}` }),
      allIds,
      sourceLocale: 'en',
    }))

    // Limit to 2 concurrent workers
    const results = await parallelCompile(tasks, 2)
    expect(results).toHaveLength(4)
    for (const result of results) {
      expect(result.stats.compiled).toBe(1)
    }
  })

  it('reports missing translations', async () => {
    const catalog: CatalogData = {
      Hello: { message: 'Hello', translation: 'こんにちは' },
      World: { message: 'World', translation: '' },
    }
    const tasks: ParallelCompileTask[] = [
      { locale: 'ja', catalog, allIds: ['Hello', 'World'], sourceLocale: 'en' },
      { locale: 'ko', catalog: {}, allIds: ['Hello', 'World'], sourceLocale: 'en' },
    ]

    const results = await parallelCompile(tasks)
    expect(results).toHaveLength(2)

    const jaResult = results.find((r) => r.locale === 'ja')!
    expect(jaResult.stats.compiled).toBe(1)
    expect(jaResult.stats.missing).toContain('World')

    const koResult = results.find((r) => r.locale === 'ko')!
    expect(koResult.stats.missing).toEqual(['Hello', 'World'])
  })
})

/**
 * Regression tests for Bug #3 and Bug #5 in the worker-based code path.
 *
 * Bug #3: When a worker returned an error, `activeWorkers` was not decremented,
 *         causing the promise to never resolve (hang).
 * Bug #5: After rejection, other workers' results were still pushed into the
 *         results array.
 *
 * These tests mock `node:fs` (existsSync → true) and `node:worker_threads` (Worker)
 * to exercise the real worker-based code path without needing a compiled .js file.
 */
describe('parallelCompile — worker error handling (regression)', () => {
  /**
   * Creates a mock Worker class whose instances emit messages from a predefined
   * response map keyed by locale.  Allows us to control exactly which workers
   * succeed and which return errors.
   */
  function createMockWorkerClass(
    responsesByLocale: Record<string, { error?: string; code?: string; stats?: { compiled: number; missing: string[] } }>,
  ) {
    return class MockWorker {
      private handlers: Record<string, ((...args: unknown[]) => void)[]> = {}

      on(event: string, handler: (...args: unknown[]) => void) {
        ;(this.handlers[event] ??= []).push(handler)
      }

      postMessage(request: { locale: string }) {
        const response = responsesByLocale[request.locale]
        if (!response) return

        // Deliver the message asynchronously (like a real worker)
        setTimeout(() => {
          const handlers = this.handlers['message'] ?? []
          for (const handler of handlers) {
            handler({
              locale: request.locale,
              code: response.code ?? '',
              stats: response.stats ?? { compiled: 0, missing: [] },
              ...(response.error ? { error: response.error } : {}),
            })
          }
        }, 0)
      }

      terminate() {
        // no-op
      }
    }
  }

  /** Helper: set up mocks and re-import parallelCompile with worker path enabled */
  async function importWithMockedWorker(
    MockWorkerClass: new (...args: unknown[]) => unknown,
  ) {
    vi.resetModules()
    vi.doMock('node:fs', () => ({ existsSync: () => true }))
    vi.doMock('node:worker_threads', () => ({ Worker: MockWorkerClass }))
    const mod = await import('../src/parallel-compile')
    return mod.parallelCompile
  }

  it('rejects when a worker returns an error response', async () => {
    const MockWorker = createMockWorkerClass({
      ja: { error: 'ICU parse error in ja' },
      'zh-CN': { code: 'export default {}', stats: { compiled: 1, missing: [] } },
    })

    const parallelCompileWorker = await importWithMockedWorker(MockWorker)

    const tasks: ParallelCompileTask[] = [
      { locale: 'ja', catalog: {}, allIds: ['Hello'], sourceLocale: 'en' },
      { locale: 'zh-CN', catalog: {}, allIds: ['Hello'], sourceLocale: 'en' },
    ]

    await expect(parallelCompileWorker(tasks, 4)).rejects.toThrow(
      'Failed to compile locale "ja": ICU parse error in ja',
    )
  })

  it('does not hang when a worker errors (activeWorkers properly decremented)', async () => {
    // All three workers return errors — the first should reject and the others
    // should be guarded by the `if (rejected) return` check.
    const MockWorker = createMockWorkerClass({
      'locale-0': { error: 'fail-0' },
      'locale-1': { error: 'fail-1' },
      'locale-2': { error: 'fail-2' },
    })

    const parallelCompileWorker = await importWithMockedWorker(MockWorker)

    const tasks: ParallelCompileTask[] = Array.from({ length: 3 }, (_, i) => ({
      locale: `locale-${i}`,
      catalog: {},
      allIds: ['Hello'],
      sourceLocale: 'en',
    }))

    // This would hang if activeWorkers-- was missing before rejectAll (Bug #3)
    // Use a timeout to catch hangs — if not rejected within 2 seconds, something is wrong.
    const result = Promise.race([
      parallelCompileWorker(tasks, 3),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('parallelCompile hung — activeWorkers not decremented')), 2000),
      ),
    ])

    await expect(result).rejects.toThrow(/Failed to compile locale "locale-\d": fail-\d/)
  })

  it('does not accumulate results after rejection (rejected guard)', async () => {
    // First worker (locale-slow-ok) responds slowly with success, second (locale-fast-error)
    // responds quickly with an error.  Without the `if (rejected) return` guard, the late
    // success from locale-slow-ok would push into the results array after rejection.
    const SlowThenErrorWorkerClass = class MockWorker {
      private handlers: Record<string, ((...args: unknown[]) => void)[]> = {}
      private locale = ''

      on(event: string, handler: (...args: unknown[]) => void) {
        ;(this.handlers[event] ??= []).push(handler)
      }

      postMessage(request: { locale: string }) {
        this.locale = request.locale

        const delay = this.locale === 'locale-fast-error' ? 5 : 50
        const response =
          this.locale === 'locale-fast-error'
            ? { locale: this.locale, code: '', stats: { compiled: 0, missing: [] }, error: 'fast error' }
            : { locale: this.locale, code: 'ok', stats: { compiled: 1, missing: [] } }

        setTimeout(() => {
          const handlers = this.handlers['message'] ?? []
          for (const handler of handlers) {
            handler(response)
          }
        }, delay)
      }

      terminate() {
        // no-op
      }
    }

    const parallelCompileWorker = await importWithMockedWorker(SlowThenErrorWorkerClass)

    const tasks: ParallelCompileTask[] = [
      { locale: 'locale-slow-ok', catalog: {}, allIds: ['Hello'], sourceLocale: 'en' },
      { locale: 'locale-fast-error', catalog: {}, allIds: ['Hello'], sourceLocale: 'en' },
    ]

    await expect(parallelCompileWorker(tasks, 2)).rejects.toThrow(
      'Failed to compile locale "locale-fast-error": fast error',
    )

    // Wait for the slow worker's response to arrive — this exercises the
    // `if (rejected) return` guard at the top of the message handler.
    // Without the guard, the late success response would push into the
    // results array and trigger additional spawnNext() calls, potentially
    // causing resolveAll() to be called after rejectAll().
    await new Promise((resolve) => setTimeout(resolve, 100))
  })

  it('rejects with timeout when a worker never responds', async () => {
    vi.useFakeTimers()

    // Worker that never sends a message (simulates a frozen worker)
    const SilentWorkerClass = class MockWorker {
      private handlers: Record<string, ((...args: unknown[]) => void)[]> = {}

      on(event: string, handler: (...args: unknown[]) => void) {
        ;(this.handlers[event] ??= []).push(handler)
      }

      postMessage(_request: { locale: string }) {
        // Intentionally never responds — simulates a frozen worker
      }

      terminate() {
        // no-op
      }
    }

    vi.resetModules()
    vi.doMock('node:fs', () => ({ existsSync: () => true }))
    vi.doMock('node:worker_threads', () => ({ Worker: SilentWorkerClass }))

    const mod = await import('../src/parallel-compile')

    const tasks: ParallelCompileTask[] = [
      { locale: 'ja', catalog: {}, allIds: ['Hello'], sourceLocale: 'en' },
      { locale: 'zh-CN', catalog: {}, allIds: ['Hello'], sourceLocale: 'en' },
    ]

    const promise = mod.parallelCompile(tasks, 2)

    // Attach the rejection handler BEFORE advancing timers to avoid unhandled rejection
    const assertion = expect(promise).rejects.toThrow(/Worker timed out after 30000ms compiling locale/)

    // Advance past the 30s worker timeout
    await vi.advanceTimersByTimeAsync(30_001)

    await assertion

    vi.useRealTimers()
  })
})
