import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadConfig } from './config-loader'
import { compileCatalog, compileIndex, collectAllIds, compileTypeDeclaration } from './compile'
import type { CatalogData } from './catalog'
import { readJsonCatalog } from './json-format'
import { readPoCatalog } from './po-format'

function readCatalog(filePath: string, format: 'json' | 'po'): CatalogData {
  if (!existsSync(filePath)) return {}
  const content = readFileSync(filePath, 'utf-8')
  return format === 'json' ? readJsonCatalog(content) : readPoCatalog(content)
}

/**
 * Programmatic compile entry point.
 * Loads config from `cwd`, reads catalogs, and writes compiled output.
 * This is the in-process equivalent of `fluenti compile`.
 */
export async function runCompile(cwd: string): Promise<void> {
  const config = await loadConfig(undefined, cwd)
  const ext = config.format === 'json' ? '.json' : '.po'

  const outDir = resolve(cwd, config.compileOutDir)
  mkdirSync(outDir, { recursive: true })

  const allCatalogs: Record<string, CatalogData> = {}
  for (const locale of config.locales) {
    const catalogPath = resolve(cwd, config.catalogDir, `${locale}${ext}`)
    allCatalogs[locale] = readCatalog(catalogPath, config.format)
  }

  const allIds = collectAllIds(allCatalogs)

  for (const locale of config.locales) {
    const { code } = compileCatalog(allCatalogs[locale]!, locale, allIds, config.sourceLocale)
    writeFileSync(resolve(outDir, `${locale}.js`), code, 'utf-8')
  }

  const indexCode = compileIndex(config.locales, config.compileOutDir)
  writeFileSync(resolve(outDir, 'index.js'), indexCode, 'utf-8')

  const typesCode = compileTypeDeclaration(allIds, allCatalogs, config.sourceLocale)
  writeFileSync(resolve(outDir, 'messages.d.ts'), typesCode, 'utf-8')
}
