import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { createRequire } from 'node:module'

export interface DevRunnerOptions {
  cwd: string
  onSuccess?: () => void
  onError?: (err: Error) => void
  /** If true, reject the promise on failure instead of swallowing the error */
  throwOnError?: boolean
  /** Run only compile (skip extract). Useful for production builds where source is unchanged. */
  compileOnly?: boolean
  /** Called before compile runs. Return false to skip compilation. */
  onBeforeCompile?: () => boolean | void | Promise<boolean | void>
  /** Called after compile completes successfully */
  onAfterCompile?: () => void | Promise<void>
}

/**
 * Walk up from `cwd` to find `node_modules/.bin/fluenti`.
 * Returns the absolute path or null if not found.
 */
export function resolveCliBin(cwd: string): string | null {
  let dir = cwd
  for (;;) {
    const bin = resolve(dir, 'node_modules/.bin/fluenti')
    if (existsSync(bin)) return bin
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

/**
 * Run compile in-process via `@fluenti/cli` (for compileOnly mode),
 * or fall back to shell-out for extract + compile (dev mode).
 */
export async function runExtractCompile(options: DevRunnerOptions): Promise<void> {
  if (options.onBeforeCompile) {
    const result = await options.onBeforeCompile()
    if (result === false) return
  }

  if (options.compileOnly) {
    try {
      // Resolve @fluenti/cli from the project's cwd (not from this package's location)
      // using createRequire so pnpm's strict node_modules layout works correctly.
      // Use require() (not import()) to load @fluenti/cli — avoids CJS/ESM interop
      // issues when dynamic import() loads minified CJS with chunk requires.
      const projectRequire = createRequire(join(options.cwd, 'package.json'))
      const { runCompile } = projectRequire('@fluenti/cli')
      await runCompile(options.cwd)
      console.log('[fluenti] Compiling... done')
      if (options.onAfterCompile) await options.onAfterCompile()
      options.onSuccess?.()
      return
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      if (options.throwOnError) throw error
      console.warn('[fluenti] Compile failed:', error.message)
      options.onError?.(error)
      return
    }
  }

  // Dev mode: shell out for extract + compile
  const bin = resolveCliBin(options.cwd)
  if (!bin) {
    const msg = '[fluenti] CLI not found — skipping auto-compile. Install @fluenti/cli as a devDependency.'
    if (options.throwOnError) {
      return Promise.reject(new Error(msg))
    }
    console.warn(msg)
    return Promise.resolve()
  }

  const command = `${bin} extract && ${bin} compile`
  return new Promise<void>((resolve, reject) => {
    exec(
      command,
      { cwd: options.cwd },
      (err, _stdout, stderr) => {
        if (err) {
          const error = new Error(stderr || err.message)
          if (options.throwOnError) {
            reject(error)
            return
          }
          console.warn('[fluenti] Extract/compile failed:', error.message)
          options.onError?.(error)
        } else {
          console.log('[fluenti] Extracting and compiling... done')
          if (options.onAfterCompile) void Promise.resolve(options.onAfterCompile()).catch(() => {})
          options.onSuccess?.()
        }
        resolve()
      },
    )
  })
}

/**
 * Create a debounced runner that collapses rapid calls.
 *
 * - If called while idle, schedules a run after `delay` ms.
 * - If called while a run is in progress, marks a pending rerun.
 * - Never runs concurrently.
 */
export function createDebouncedRunner(
  options: DevRunnerOptions,
  delay = 300,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  let running = false
  let pendingRerun = false

  async function execute(): Promise<void> {
    running = true
    try {
      await runExtractCompile(options)
    } finally {
      running = false
      if (pendingRerun) {
        pendingRerun = false
        schedule()
      }
    }
  }

  function schedule(): void {
    if (timer !== null) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      timer = null
      if (running) {
        pendingRerun = true
      } else {
        execute()
      }
    }, delay)
  }

  return schedule
}
