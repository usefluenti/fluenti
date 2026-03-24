import { join } from 'node:path'
import { createRequire } from 'node:module'

export interface DevRunnerOptions {
  cwd: string
  onSuccess?: () => void
  onError?: (err: Error) => void
  /** If true, reject the promise on failure instead of swallowing the error */
  throwOnError?: boolean
  /** Run only compile (skip extract). Useful for production builds where source is unchanged. */
  compileOnly?: boolean
  /** Enable parallel compilation across locales using worker threads */
  parallelCompile?: boolean
  /** Called before compile runs. Return false to skip compilation. */
  onBeforeCompile?: () => boolean | void | Promise<boolean | void>
  /** Called after compile completes successfully */
  onAfterCompile?: () => void | Promise<void>
}

/**
 * Run compile in-process via `@fluenti/cli`.
 *
 * In `compileOnly` mode, only compilation is performed (extract is skipped).
 * In dev mode, both extract and compile run in sequence.
 *
 * If `@fluenti/cli` is not installed, shows an install guide instead of
 * falling back to shell-out — keeping the process boundary clean.
 */
export async function runExtractCompile(options: DevRunnerOptions): Promise<void> {
  if (options.onBeforeCompile) {
    const result = await options.onBeforeCompile()
    if (result === false) return
  }

  if (options.compileOnly) {
    try {
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

  // Dev mode: in-process extract + compile
  try {
    const projectRequire = createRequire(join(options.cwd, 'package.json'))
    const { runExtract, runCompile } = projectRequire('@fluenti/cli')
    await runExtract(options.cwd)
    await runCompile(options.cwd, { parallel: options.parallelCompile })
    console.log('[fluenti] Extracting and compiling... done')
    if (options.onAfterCompile) await options.onAfterCompile()
    options.onSuccess?.()
    return
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    const isNotInstalled = error.message.includes('Cannot find module')

    if (isNotInstalled) {
      const msg =
        '[fluenti] @fluenti/cli is required for auto-compile.\n' +
        '  Install it as a devDependency:\n' +
        '    pnpm add -D @fluenti/cli\n' +
        '  See: https://fluenti.dev/start/introduction/'
      if (options.throwOnError) throw new Error(msg)
      console.warn(msg)
      options.onError?.(new Error(msg))
      return
    }

    if (options.throwOnError) throw error
    console.warn('[fluenti] Extract/compile failed:', error.message)
    options.onError?.(error)
  }
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
