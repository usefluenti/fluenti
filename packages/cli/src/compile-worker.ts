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
}

parentPort!.on('message', (req: CompileWorkerRequest) => {
  const { code, stats } = compileCatalog(req.catalog, req.locale, req.allIds, req.sourceLocale, req.options)
  const response: CompileWorkerResponse = { locale: req.locale, code, stats }
  parentPort!.postMessage(response)
})
