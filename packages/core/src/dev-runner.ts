import { exec } from 'node:child_process'

export interface DevRunnerOptions {
  cwd: string
  onSuccess?: () => void
  onError?: (err: Error) => void
  /** If true, reject the promise on failure instead of swallowing the error */
  throwOnError?: boolean
}

/**
 * Run extract + compile via the CLI binary.
 * Non-blocking — errors are reported but never throw.
 */
export function runExtractCompile(options: DevRunnerOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    exec(
      'npx fluenti extract && npx fluenti compile',
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
