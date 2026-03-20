import { describe, it, expect, vi, beforeEach } from 'vitest'
import { watch } from 'node:fs'
import type { WatchListener } from 'node:fs'

// Capture the watch callbacks for manual triggering
const watchCallbacks: Array<WatchListener<string>> = []
const mockCloseCallbacks: Array<ReturnType<typeof vi.fn>> = []

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    watch: vi.fn((_path: string, _opts: unknown, cb: WatchListener<string>) => {
      watchCallbacks.push(cb)
      const close = vi.fn()
      mockCloseCallbacks.push(close)
      return { close }
    }),
  }
})

const mockDebouncedRun = vi.fn()
vi.mock('../src/dev-runner', () => ({
  createDebouncedRunner: vi.fn(() => mockDebouncedRun),
}))

// Must import after mocks are set up
const { startDevWatcher, extractWatchDirs } = await import('../src/dev-watcher')

describe('extractWatchDirs', () => {
  it('falls back to src/ when no include patterns provided', () => {
    const dirs = extractWatchDirs('/project')
    expect(dirs).toEqual(['/project/src'])
  })

  it('falls back to src/ when include is empty array', () => {
    const dirs = extractWatchDirs('/project', [])
    expect(dirs).toEqual(['/project/src'])
  })

  it('extracts directory from ./src/**/*.tsx pattern', () => {
    const dirs = extractWatchDirs('/project', ['./src/**/*.tsx'])
    expect(dirs).toEqual(['/project/src'])
  })

  it('extracts directory from ./app/**/*.ts pattern', () => {
    const dirs = extractWatchDirs('/project', ['./app/**/*.ts'])
    expect(dirs).toEqual(['/project/app'])
  })

  it('extracts project root from ./**/*.ts pattern', () => {
    const dirs = extractWatchDirs('/project', ['./**/*.ts'])
    expect(dirs).toEqual(['/project'])
  })

  it('deduplicates directories from multiple patterns', () => {
    const dirs = extractWatchDirs('/project', [
      './src/**/*.tsx',
      './src/**/*.ts',
    ])
    expect(dirs).toEqual(['/project/src'])
  })

  it('returns multiple directories from different patterns', () => {
    const dirs = extractWatchDirs('/project', [
      './app/**/*.tsx',
      './lib/**/*.ts',
    ])
    expect(dirs).toHaveLength(2)
    expect(dirs).toContain('/project/app')
    expect(dirs).toContain('/project/lib')
  })
})

describe('startDevWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    watchCallbacks.length = 0
    mockCloseCallbacks.length = 0
  })

  function createAndCleanup(options?: { include?: string[] }): () => void {
    const cleanup = startDevWatcher({
      cwd: '/project',
      compiledDir: './locales/compiled',
      ...options,
    })
    return cleanup
  }

  it('starts watcher and triggers initial run', () => {
    const cleanup = startDevWatcher({
      cwd: '/project',
      compiledDir: './locales/compiled',
      delay: 500,
    })

    expect(mockDebouncedRun).toHaveBeenCalledTimes(1)
    expect(watchCallbacks).toHaveLength(1)

    cleanup()
    expect(mockCloseCallbacks[0]).toHaveBeenCalled()
  })

  it('watches src/ by default when no include provided', () => {
    const cleanup = createAndCleanup()

    expect(vi.mocked(watch)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(watch).mock.calls[0]![0]).toBe('/project/src')

    cleanup()
  })

  it('watches app/ when include specifies ./app/**/*.tsx', () => {
    const cleanup = createAndCleanup({ include: ['./app/**/*.tsx'] })

    expect(vi.mocked(watch)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(watch).mock.calls[0]![0]).toBe('/project/app')

    cleanup()
  })

  it('creates multiple watchers for multiple include directories', () => {
    const cleanup = createAndCleanup({
      include: ['./app/**/*.tsx', './lib/**/*.ts'],
    })

    expect(vi.mocked(watch)).toHaveBeenCalledTimes(2)
    const watchedPaths = vi.mocked(watch).mock.calls.map(c => c[0])
    expect(watchedPaths).toContain('/project/app')
    expect(watchedPaths).toContain('/project/lib')

    cleanup()
    // All watchers should be closed
    for (const close of mockCloseCallbacks) {
      expect(close).toHaveBeenCalled()
    }
  })

  it('triggers debounced runner on .tsx file change', () => {
    const cleanup = createAndCleanup()
    mockDebouncedRun.mockClear()

    watchCallbacks[0]!('change', 'components/App.tsx')
    expect(mockDebouncedRun).toHaveBeenCalledTimes(1)

    cleanup()
  })

  it('triggers debounced runner on .ts file change', () => {
    const cleanup = createAndCleanup()
    mockDebouncedRun.mockClear()

    watchCallbacks[0]!('change', 'lib/utils.ts')
    expect(mockDebouncedRun).toHaveBeenCalledTimes(1)

    cleanup()
  })

  it('does not trigger on non-source files', () => {
    const cleanup = createAndCleanup()
    mockDebouncedRun.mockClear()

    watchCallbacks[0]!('change', 'styles/app.css')
    expect(mockDebouncedRun).not.toHaveBeenCalled()

    cleanup()
  })

  it('does not trigger on null filename', () => {
    const cleanup = createAndCleanup()
    mockDebouncedRun.mockClear()

    watchCallbacks[0]!('change', null as unknown as string)
    expect(mockDebouncedRun).not.toHaveBeenCalled()

    cleanup()
  })

  it('does not trigger on node_modules paths', () => {
    const cleanup = createAndCleanup()
    mockDebouncedRun.mockClear()

    watchCallbacks[0]!('change', 'node_modules/some-pkg/index.ts')
    expect(mockDebouncedRun).not.toHaveBeenCalled()

    cleanup()
  })

  it('does not trigger on .next paths', () => {
    const cleanup = createAndCleanup()
    mockDebouncedRun.mockClear()

    watchCallbacks[0]!('change', '.next/cache/file.ts')
    expect(mockDebouncedRun).not.toHaveBeenCalled()

    cleanup()
  })

  it('prevents duplicate watchers on multiple calls', () => {
    const cleanup1 = createAndCleanup()
    const callCount = vi.mocked(watch).mock.calls.length

    const cleanup2 = startDevWatcher({
      cwd: '/project',
      compiledDir: './locales/compiled',
    })

    // Should not create a second watcher
    expect(vi.mocked(watch).mock.calls.length).toBe(callCount)
    expect(cleanup1).toBe(cleanup2)

    cleanup1()
  })
})
