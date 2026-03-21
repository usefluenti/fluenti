import { Worker } from 'node:worker_threads'
import { availableParallelism } from 'node:os'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CatalogData } from './catalog'
import type { CompileOptions, CompileStats } from './compile'
import type { CompileWorkerRequest, CompileWorkerResponse } from './compile-worker'

export interface ParallelCompileTask {
  locale: string
  catalog: CatalogData
  allIds: string[]
  sourceLocale: string
  options?: CompileOptions
}

export interface ParallelCompileResult {
  locale: string
  code: string
  stats: CompileStats
}

function getWorkerPath(): string {
  const thisDir = typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url))
  return resolve(thisDir, 'compile-worker.js')
}

/**
 * Compile multiple locales in parallel using worker threads.
 *
 * - Single task → returns result directly (no worker overhead)
 * - Multiple tasks → spawns min(tasks, availableParallelism()) workers
 * - Workers are created per-call and destroyed after completion
 *
 * Falls back to in-process compilation when the compiled worker is unavailable
 * (e.g. when running from TypeScript source in development/tests).
 */
export async function parallelCompile(
  tasks: ParallelCompileTask[],
  concurrency?: number,
): Promise<ParallelCompileResult[]> {
  if (tasks.length === 0) return []

  // Single task: compile in-process, no worker overhead
  if (tasks.length === 1) {
    const { compileCatalog } = await import('./compile')
    const task = tasks[0]!
    const { code, stats } = compileCatalog(task.catalog, task.locale, task.allIds, task.sourceLocale, task.options)
    return [{ locale: task.locale, code, stats }]
  }

  const workerPath = getWorkerPath()

  // If compiled worker doesn't exist (dev/test), fall back to concurrent in-process compilation
  if (!existsSync(workerPath)) {
    return inProcessParallelCompile(tasks)
  }

  const maxWorkers = concurrency ?? Math.min(tasks.length, availableParallelism())
  const results: ParallelCompileResult[] = []
  const queue = [...tasks]
  let rejected = false

  return new Promise<ParallelCompileResult[]>((resolveAll, rejectAll) => {
    let activeWorkers = 0

    function spawnNext(): void {
      if (rejected) return
      const task = queue.shift()
      if (!task) {
        if (activeWorkers === 0) {
          resolveAll(results)
        }
        return
      }

      activeWorkers++
      const worker = new Worker(workerPath)

      worker.on('message', (response: CompileWorkerResponse) => {
        results.push({
          locale: response.locale,
          code: response.code,
          stats: response.stats,
        })
        activeWorkers--
        worker.terminate()
        spawnNext()
      })

      worker.on('error', (err) => {
        if (!rejected) {
          rejected = true
          worker.terminate()
          rejectAll(new Error(`Worker error compiling locale "${task.locale}": ${err.message}`))
        }
      })

      const request: CompileWorkerRequest = {
        locale: task.locale,
        catalog: task.catalog,
        allIds: task.allIds,
        sourceLocale: task.sourceLocale,
        options: task.options,
      }
      worker.postMessage(request)
    }

    // Start initial batch of workers
    const initialBatch = Math.min(maxWorkers, queue.length)
    for (let i = 0; i < initialBatch; i++) {
      spawnNext()
    }
  })
}

/**
 * In-process fallback for parallel compilation.
 * Uses Promise.all for concurrency when workers are unavailable.
 */
async function inProcessParallelCompile(
  tasks: ParallelCompileTask[],
): Promise<ParallelCompileResult[]> {
  const { compileCatalog } = await import('./compile')
  return Promise.all(
    tasks.map((task) => {
      const { code, stats } = compileCatalog(task.catalog, task.locale, task.allIds, task.sourceLocale, task.options)
      return { locale: task.locale, code, stats }
    }),
  )
}
