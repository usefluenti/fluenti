import { parentPort } from 'node:worker_threads'
import { compileCatalog } from './compile'
import type { CatalogData } from './catalog'
import type { CompileOptions } from './compile'

export interface CompileWorkerRequest {
  locale: string
  catalog: CatalogData
  allIds: string[]
  sourceLocale: string
  options?: CompileOptions | undefined
}

export interface CompileWorkerResponse {
  locale: string
  code: string
  stats: { compiled: number; missing: string[] }
  error?: string
}

parentPort!.on('message', (req: CompileWorkerRequest) => {
  try {
    const { code, stats } = compileCatalog(req.catalog, req.locale, req.allIds, req.sourceLocale, req.options)
    parentPort!.postMessage({ locale: req.locale, code, stats } satisfies CompileWorkerResponse)
  } catch (err) {
    parentPort!.postMessage({
      locale: req.locale,
      code: '',
      stats: { compiled: 0, missing: [] },
      error: err instanceof Error ? err.message : String(err),
    } satisfies CompileWorkerResponse)
  }
})
