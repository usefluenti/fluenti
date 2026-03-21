import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveLocaleCodes } from '@fluenti/core'
import { loadConfig } from './config-loader'
import { compileCatalog, compileIndex, collectAllIds, compileTypeDeclaration } from './compile'
import { parallelCompile } from './parallel-compile'
import type { CatalogData } from './catalog'
import { readJsonCatalog } from './json-format'
import { readPoCatalog } from './po-format'

function readCatalog(filePath: string, format: 'json' | 'po'): CatalogData {
  if (!existsSync(filePath)) return {}
  const content = readFileSync(filePath, 'utf-8')
  return format === 'json' ? readJsonCatalog(content) : readPoCatalog(content)
}

export interface RunCompileOptions {
  parallel?: boolean
}

/**
 * Programmatic compile entry point.
 * Loads config from `cwd`, reads catalogs, and writes compiled output.
 * This is the in-process equivalent of `fluenti compile`.
 */
export async function runCompile(cwd: string, options?: RunCompileOptions): Promise<void> {
  const config = await loadConfig(undefined, cwd)
  const localeCodes = resolveLocaleCodes(config.locales)
  const ext = config.format === 'json' ? '.json' : '.po'

  const outDir = resolve(cwd, config.compileOutDir)
  mkdirSync(outDir, { recursive: true })

  const allCatalogs: Record<string, CatalogData> = {}
  for (const locale of localeCodes) {
    const catalogPath = resolve(cwd, config.catalogDir, `${locale}${ext}`)
    allCatalogs[locale] = readCatalog(catalogPath, config.format)
  }

  const allIds = collectAllIds(allCatalogs)

  if (options?.parallel && localeCodes.length > 1) {
    const tasks = localeCodes.map((locale) => ({
      locale,
      catalog: allCatalogs[locale]!,
      allIds,
      sourceLocale: config.sourceLocale,
    }))

    const results = await parallelCompile(tasks)

    for (const result of results) {
      writeFileSync(resolve(outDir, `${result.locale}.js`), result.code, 'utf-8')
    }
  } else {
    for (const locale of localeCodes) {
      const { code } = compileCatalog(allCatalogs[locale]!, locale, allIds, config.sourceLocale)
      writeFileSync(resolve(outDir, `${locale}.js`), code, 'utf-8')
    }
  }

  const indexCode = compileIndex(localeCodes, config.compileOutDir)
  writeFileSync(resolve(outDir, 'index.js'), indexCode, 'utf-8')

  const typesCode = compileTypeDeclaration(allIds, allCatalogs, config.sourceLocale)
  writeFileSync(resolve(outDir, 'messages.d.ts'), typesCode, 'utf-8')
}
