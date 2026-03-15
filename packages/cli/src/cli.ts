#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'
import consola from 'consola'
import fg from 'fast-glob'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname, extname } from 'node:path'
import { extractFromVue } from './vue-extractor'
import { extractFromTsx } from './tsx-extractor'
import { updateCatalog } from './catalog'
import type { CatalogData } from './catalog'
import { readJsonCatalog, writeJsonCatalog } from './json-format'
import { readPoCatalog, writePoCatalog } from './po-format'
import { compileCatalog, compileCatalogSplit, compileIndex, collectAllIds } from './compile'
import type { ExtractedMessage } from '@fluenti/core'

interface FluentConfig {
  sourceLocale: string
  locales: string[]
  catalogDir: string
  format: 'json' | 'po'
  include: string[]
  compileOutDir: string
}

const defaultConfig: FluentConfig = {
  sourceLocale: 'en',
  locales: ['en'],
  catalogDir: './locales',
  format: 'po',
  include: ['./src/**/*.{vue,tsx,jsx,ts,js}'],
  compileOutDir: './locales/compiled',
}

async function loadConfig(configPath?: string): Promise<FluentConfig> {
  const paths = configPath
    ? [resolve(configPath)]
    : [
        resolve('fluenti.config.ts'),
        resolve('fluenti.config.js'),
        resolve('fluenti.config.mjs'),
      ]

  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const { createJiti } = await import('jiti')
        const jiti = createJiti(import.meta.url)
        const mod = await jiti.import(p) as { default?: Partial<FluentConfig> }
        const userConfig = mod.default ?? mod as unknown as Partial<FluentConfig>
        return { ...defaultConfig, ...userConfig }
      } catch {
        consola.warn(`Failed to load config from ${p}, using defaults`)
      }
    }
  }

  return defaultConfig
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

function extractFromFile(filePath: string, code: string): ExtractedMessage[] {
  const ext = extname(filePath)
  if (ext === '.vue') return extractFromVue(code, filePath)
  return extractFromTsx(code, filePath)
}

const extract = defineCommand({
  meta: { name: 'extract', description: 'Extract messages from source files' },
  args: {
    config: { type: 'string', description: 'Path to config file' },
  },
  async run({ args }) {
    const config = await loadConfig(args.config)
    consola.info(`Extracting messages from ${config.include.join(', ')}`)

    const files = await fg(config.include, { absolute: true })
    const allMessages: ExtractedMessage[] = []

    for (const file of files) {
      const code = readFileSync(file, 'utf-8')
      const messages = extractFromFile(file, code)
      allMessages.push(...messages)
    }

    consola.info(`Found ${allMessages.length} messages in ${files.length} files`)

    const ext = config.format === 'json' ? '.json' : '.po'

    for (const locale of config.locales) {
      const catalogPath = resolve(config.catalogDir, `${locale}${ext}`)
      const existing = readCatalog(catalogPath, config.format)
      const { catalog, result } = updateCatalog(existing, allMessages)
      writeCatalog(catalogPath, catalog, config.format)
      consola.success(
        `${locale}: ${result.added} added, ${result.unchanged} unchanged, ${result.obsolete} obsolete`,
      )
    }
  },
})

const compile = defineCommand({
  meta: { name: 'compile', description: 'Compile message catalogs to JS modules' },
  args: {
    config: { type: 'string', description: 'Path to config file' },
    split: { type: 'boolean', description: 'Output ES module named exports for tree-shaking' },
  },
  async run({ args }) {
    const config = await loadConfig(args.config)
    const ext = config.format === 'json' ? '.json' : '.po'

    mkdirSync(config.compileOutDir, { recursive: true })

    if (args.split) {
      // Split mode: named exports per message for tree-shaking
      // First, collect all catalogs and build union of IDs
      const allCatalogs: Record<string, CatalogData> = {}
      for (const locale of config.locales) {
        const catalogPath = resolve(config.catalogDir, `${locale}${ext}`)
        allCatalogs[locale] = readCatalog(catalogPath, config.format)
      }

      const allIds = collectAllIds(allCatalogs)
      consola.info(`Split mode: ${allIds.length} messages across ${config.locales.length} locales`)

      for (const locale of config.locales) {
        const compiled = compileCatalogSplit(allCatalogs[locale]!, locale, allIds)
        const outPath = resolve(config.compileOutDir, `${locale}.js`)
        writeFileSync(outPath, compiled, 'utf-8')
        consola.success(`Compiled ${locale} → ${outPath}`)
      }

      // Generate index.js with locale list and lazy loaders
      const indexCode = compileIndex(config.locales, config.compileOutDir)
      const indexPath = resolve(config.compileOutDir, 'index.js')
      writeFileSync(indexPath, indexCode, 'utf-8')
      consola.success(`Generated index → ${indexPath}`)
    } else {
      // Legacy mode: default export object
      for (const locale of config.locales) {
        const catalogPath = resolve(config.catalogDir, `${locale}${ext}`)
        const catalog = readCatalog(catalogPath, config.format)
        const compiled = compileCatalog(catalog, locale)
        const outPath = resolve(config.compileOutDir, `${locale}.ts`)
        writeFileSync(outPath, compiled, 'utf-8')
        consola.success(`Compiled ${locale} → ${outPath}`)
      }
    }
  },
})

const stats = defineCommand({
  meta: { name: 'stats', description: 'Show translation progress' },
  args: {
    config: { type: 'string', description: 'Path to config file' },
  },
  async run({ args }) {
    const config = await loadConfig(args.config)
    const ext = config.format === 'json' ? '.json' : '.po'

    const rows: Array<{ locale: string; total: number; translated: number; pct: string }> = []

    for (const locale of config.locales) {
      const catalogPath = resolve(config.catalogDir, `${locale}${ext}`)
      const catalog = readCatalog(catalogPath, config.format)
      const entries = Object.values(catalog).filter((e) => !e.obsolete)
      const total = entries.length
      const translated = entries.filter((e) => e.translation && e.translation.length > 0).length
      const pct = total > 0 ? ((translated / total) * 100).toFixed(1) + '%' : '—'
      rows.push({ locale, total, translated, pct })
    }

    consola.log('')
    consola.log('  Locale  │ Total │ Translated │ Progress')
    consola.log('  ────────┼───────┼────────────┼─────────')
    for (const row of rows) {
      consola.log(
        `  ${row.locale.padEnd(8)}│ ${String(row.total).padStart(5)} │ ${String(row.translated).padStart(10)} │ ${row.pct}`,
      )
    }
    consola.log('')
  },
})

const main = defineCommand({
  meta: {
    name: 'fluenti',
    version: '0.0.1',
    description: 'Compile-time i18n for modern frameworks',
  },
  subCommands: { extract, compile, stats },
})

runMain(main)
