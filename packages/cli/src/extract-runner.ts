import fg from 'fast-glob'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, dirname, extname } from 'node:path'
import { extractFromTsx } from './tsx-extractor'
import { updateCatalog } from './catalog'
import type { CatalogData } from './catalog'
import { readJsonCatalog, writeJsonCatalog } from './json-format'
import { readPoCatalog, writePoCatalog } from './po-format'
import { ExtractCache } from './extract-cache'
import { loadConfig } from './config-loader'
import type { ExtractedMessage } from '@fluenti/core'
import { resolveLocaleCodes } from '@fluenti/core'

function deriveProjectId(cwd: string): string {
  return createHash('md5').update(cwd).digest('hex').slice(0, 8)
}

export interface RunExtractOptions {
  clean?: boolean
  stripFuzzy?: boolean
  useCache?: boolean
}

function readCatalog(filePath: string, format: 'json' | 'po'): CatalogData {
  if (!existsSync(filePath)) return {}
  const content = readFileSync(filePath, 'utf-8')
  return format === 'json' ? readJsonCatalog(content) : readPoCatalog(content)
}

function writeCatalog(filePath: string, catalog: CatalogData, format: 'json' | 'po'): void {
  mkdirSync(dirname(filePath), { recursive: true })
  const content = format === 'json' ? writeJsonCatalog(catalog) : writePoCatalog(catalog)
  writeFileSync(filePath, content, 'utf-8')
}

async function extractFromFile(filePath: string, code: string): Promise<ExtractedMessage[]> {
  const ext = extname(filePath)
  if (ext === '.vue') {
    try {
      const { extractFromVue } = await import('./vue-extractor')
      return extractFromVue(code, filePath)
    } catch {
      return []
    }
  }
  return extractFromTsx(code, filePath)
}

/**
 * Programmatic extract entry point.
 * Loads config from `cwd`, extracts messages, and writes catalogs.
 * This is the in-process equivalent of `fluenti extract`.
 */
export async function runExtract(cwd: string, options?: RunExtractOptions): Promise<void> {
  const config = await loadConfig(undefined, cwd)
  const localeCodes = resolveLocaleCodes(config.locales)

  const files = await fg(config.include, { cwd, ignore: config.exclude ?? [] })
  const allMessages: ExtractedMessage[] = []
  const useCache = options?.useCache !== false
  const cache = useCache ? new ExtractCache(resolve(cwd, config.catalogDir), deriveProjectId(cwd)) : null

  for (const file of files) {
    const absFile = resolve(cwd, file)
    if (cache) {
      const cached = cache.get(absFile)
      if (cached) {
        allMessages.push(...cached)
        continue
      }
    }

    const code = readFileSync(absFile, 'utf-8')
    const messages = await extractFromFile(absFile, code)
    allMessages.push(...messages)

    if (cache) {
      cache.set(absFile, messages)
    }
  }

  if (cache) {
    cache.prune(new Set(files.map((f) => resolve(cwd, f))))
    cache.save()
  }

  const ext = config.format === 'json' ? '.json' : '.po'
  const clean = options?.clean ?? false
  const stripFuzzy = options?.stripFuzzy ?? false

  for (const locale of localeCodes) {
    const catalogPath = resolve(cwd, config.catalogDir, `${locale}${ext}`)
    const existing = readCatalog(catalogPath, config.format)
    const { catalog } = updateCatalog(existing, allMessages, { stripFuzzy })

    const finalCatalog = clean
      ? Object.fromEntries(Object.entries(catalog).filter(([, entry]) => !entry.obsolete))
      : catalog

    writeCatalog(catalogPath, finalCatalog, config.format)
  }
}
