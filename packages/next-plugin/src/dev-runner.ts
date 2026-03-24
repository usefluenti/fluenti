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
}

/**
 * Run compile in-process via `@fluenti/cli` (for compileOnly mode),
 * or extract + compile in dev mode. Requires `@fluenti/cli` to be installed
 * as a devDependency.
 */
export async function runExtractCompile(options: DevRunnerOptions): Promise<void> {
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

  // Dev mode: run in-process extract + compile.
  // Step 1: load @fluenti/cli — if not installed, guide user to install it.
  // Step 2: run — errors here mean the CLI ran but failed; surface them.
  let fluentCli: { runExtract: (cwd: string) => Promise<void>; runCompile: (cwd: string, opts?: { parallel: boolean }) => Promise<void> } | null = null
  try {
    const projectRequire = createRequire(join(options.cwd, 'package.json'))
    fluentCli = projectRequire('@fluenti/cli')
  } catch {
    // @fluenti/cli not installed — will show install guide below
  }

  if (fluentCli) {
    try {
      await fluentCli.runExtract(options.cwd)
      if (options.parallelCompile) {
        await fluentCli.runCompile(options.cwd, { parallel: true })
      } else {
        await fluentCli.runCompile(options.cwd)
      }
      console.log('[fluenti] Extracting and compiling... done')
      options.onSuccess?.()
      return
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      if (options.throwOnError) throw error
      console.warn('[fluenti] Extract/compile failed:', error.message)
      options.onError?.(error)
      return
    }
  }

  const msg =
    '[fluenti] @fluenti/cli is required for auto-compile.\n' +
    '  Install it as a devDependency:\n' +
    '    pnpm add -D @fluenti/cli\n' +
    '  See: https://fluenti.dev/start/introduction/'
  if (options.throwOnError) {
    throw new Error(msg)
  }
  console.warn(msg)
  options.onError?.(new Error(msg))
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
