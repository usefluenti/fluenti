import fg from 'fast-glob'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, dirname, extname } from 'node:path'
import { extractFromTsx } from './tsx-extractor'
import { updateCatalog } from './catalog'
import type { CatalogData, UpdateResult } from './catalog'
import { readJsonCatalog, writeJsonCatalog } from './json-format'
import { readPoCatalog, writePoCatalog } from './po-format'
import { ExtractCache } from './extract-cache'
import { normalizeMessageOrigins, resolveExtractFilePaths } from './extract-path'
import type { ExtractedMessage, FluentiBuildConfig, PluginExtractContext } from '@fluenti/core/compiler'
import { resolveLocaleCodes, createPluginRunner } from '@fluenti/core/compiler'

function deriveProjectId(cwd: string): string {
  return createHash('md5').update(cwd).digest('hex').slice(0, 8)
}

function readCatalog(filePath: string, format: 'json' | 'po'): CatalogData {
  if (!existsSync(filePath)) return {}
  const content = readFileSync(filePath, 'utf-8')
  return format === 'json' ? readJsonCatalog(content) : readPoCatalog(content)
}

function writeCatalog(filePath: string, catalog: CatalogData, format: 'json' | 'po'): void {
  const content = format === 'json' ? writeJsonCatalog(catalog) : writePoCatalog(catalog)
  try {
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, content, 'utf-8')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to write catalog "${filePath}": ${message}`)
  }
}

async function extractFromFile(
  filePath: string,
  code: string,
  idGenerator?: (message: string, context?: string) => string,
): Promise<ExtractedMessage[]> {
  const ext = extname(filePath)
  if (ext === '.vue') {
    try {
      const { extractFromVue } = await import('./vue-extractor')
      return extractFromVue(code, filePath, idGenerator)
    } catch {
      return []
    }
  }
  return extractFromTsx(code, filePath, idGenerator)
}

export interface ExtractWorkflowOptions {
  clean?: boolean
  stripFuzzy?: boolean
  useCache?: boolean
  noLineNumbers?: boolean
}

export interface ExtractWorkflowResult {
  fileCount: number
  messageCount: number
  cacheHits: number
  localeResults: Array<{ locale: string; result: UpdateResult }>
}

export async function runExtractWorkflow(
  cwd: string,
  config: FluentiBuildConfig,
  options?: ExtractWorkflowOptions,
): Promise<ExtractWorkflowResult> {
  const localeCodes = resolveLocaleCodes(config.locales)
  const files = await fg(config.include, { cwd, ignore: config.exclude ?? [], absolute: false })
  const allMessages: ExtractedMessage[] = []
  const useCache = options?.useCache !== false
  const cache = useCache ? new ExtractCache(resolve(cwd, config.catalogDir), deriveProjectId(cwd)) : null
  let cacheHits = 0
  const currentFiles = new Set<string>()

  for (const file of files) {
    const { absoluteFile, displayFile } = resolveExtractFilePaths(cwd, file)
    currentFiles.add(absoluteFile)

    if (cache) {
      const cached = cache.get(absoluteFile)
      if (cached) {
        const normalizedCached = normalizeMessageOrigins(cached, displayFile)
        allMessages.push(...normalizedCached.messages)
        if (normalizedCached.changed) {
          cache.set(absoluteFile, normalizedCached.messages)
        }
        cacheHits++
        continue
      }
    }

    const code = readFileSync(absoluteFile, 'utf-8')
    const messages = normalizeMessageOrigins(
      await extractFromFile(displayFile, code, config.idGenerator),
      displayFile,
    ).messages
    allMessages.push(...messages)

    if (cache) {
      cache.set(absoluteFile, messages)
    }
  }

  if (cache) {
    cache.prune(currentFiles)
    cache.save()
  }

  const pluginRunner = config.plugins?.length
    ? createPluginRunner(config.plugins)
    : undefined

  if (pluginRunner) {
    const messageMap = new Map<string, ExtractedMessage>()
    for (const msg of allMessages) {
      messageMap.set(msg.id, msg)
    }
    const extractContext: PluginExtractContext = {
      messages: messageMap,
      sourceLocale: config.sourceLocale,
      targetLocales: localeCodes.filter((locale) => locale !== config.sourceLocale),
      config,
    }
    await pluginRunner.runAfterExtract(extractContext)
  }

  const ext = config.format === 'json' ? '.json' : '.po'
  const clean = options?.clean ?? false
  const stripFuzzy = options?.stripFuzzy ?? false
  const noLineNumbers = options?.noLineNumbers ?? false
  const localeResults: ExtractWorkflowResult['localeResults'] = []

  for (const locale of localeCodes) {
    const catalogPath = resolve(cwd, config.catalogDir, `${locale}${ext}`)
    const existing = readCatalog(catalogPath, config.format)
    const { catalog, result } = updateCatalog(existing, allMessages, { stripFuzzy, noLineNumbers })

    const finalCatalog = clean
      ? Object.fromEntries(Object.entries(catalog).filter(([, entry]) => !entry.obsolete))
      : catalog

    writeCatalog(catalogPath, finalCatalog, config.format)
    localeResults.push({ locale, result })
  }

  return {
    fileCount: files.length,
    messageCount: allMessages.length,
    cacheHits,
    localeResults,
  }
}
