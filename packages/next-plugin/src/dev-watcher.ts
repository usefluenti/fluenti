import { watch } from 'node:fs'
import { resolve } from 'node:path'
import { createDebouncedRunner } from './dev-runner'

export interface DevWatcherOptions {
  cwd: string
  compiledDir: string
  delay?: number
  /** Glob patterns from fluenti.config.ts `include` field */
  include?: string[]
}

let activeWatcher: (() => void) | null = null

/**
 * Extract watch directories from include glob patterns.
 *
 * Takes the static prefix before the first glob wildcard (`*`).
 * Falls back to `src` if no include patterns are provided.
 *
 * @example
 * extractWatchDirs('/proj', ['./src/**\/*.tsx']) → ['/proj/src']
 * extractWatchDirs('/proj', ['./app/**\/*.ts', './lib/**\/*.ts']) → ['/proj/app', '/proj/lib']
 * extractWatchDirs('/proj', ['./**\/*.ts']) → ['/proj']
 */
export function extractWatchDirs(cwd: string, include?: string[]): string[] {
  if (!include || include.length === 0) {
    return [resolve(cwd, 'src')]
  }

  const dirs = new Set<string>()
  for (const pattern of include) {
    const normalized = pattern.replace(/^\.\//, '')
    const staticPart = normalized.split('*')[0]!.replace(/\/+$/, '')
    dirs.add(staticPart || '.')
  }
  return [...dirs].map(d => resolve(cwd, d))
}

/**
 * Start a standalone file watcher for dev auto-compile.
 *
 * Works independently of webpack/Turbopack — watches source directories
 * (inferred from `include` patterns) for changes and triggers
 * extract+compile via the debounced runner.
 *
 * Only one watcher is active at a time (guards against multiple `applyFluenti()` calls).
 *
 * @returns A cleanup function that stops the watcher.
 */
export function startDevWatcher(options: DevWatcherOptions): () => void {
  // Prevent duplicate watchers (applyFluenti may be called multiple times)
  if (activeWatcher) return activeWatcher

  const { cwd, compiledDir, delay = 1000, include } = options
  const compiledDirResolved = resolve(cwd, compiledDir)
  const debouncedRun = createDebouncedRunner({ cwd }, delay)

  // Initial run
  debouncedRun()

  const watchDirs = extractWatchDirs(cwd, include)
  const watchers = watchDirs.map(dir =>
    watch(dir, { recursive: true }, (_event, filename) => {
      if (!filename) return
      if (!/\.[jt]sx?$/.test(filename)) return
      if (filename.includes('node_modules') || filename.includes('.next')) return
      const full = resolve(dir, filename)
      if (full.startsWith(compiledDirResolved)) return
      debouncedRun()
    }),
  )

  const cleanup = (): void => {
    for (const w of watchers) w.close()
    activeWatcher = null
  }

  activeWatcher = cleanup
  return cleanup
}
