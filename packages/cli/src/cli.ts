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
import { compileCatalog, compileIndex, collectAllIds } from './compile'
import { translateCatalog } from './translate'
import type { AIProvider } from './translate'
import { runMigrate } from './migrate'
import type { ExtractedMessage, FluentiConfig } from '@fluenti/core'

const defaultConfig: FluentiConfig = {
  sourceLocale: 'en',
  locales: ['en'],
  catalogDir: './locales',
  format: 'po',
  include: ['./src/**/*.{vue,tsx,jsx,ts,js}'],
  compileOutDir: './locales/compiled',
}

async function loadConfig(configPath?: string): Promise<FluentiConfig> {
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
        const mod = await jiti.import(p) as { default?: Partial<FluentiConfig> }
        const userConfig = mod.default ?? mod as unknown as Partial<FluentiConfig>
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
  },
  async run({ args }) {
    const config = await loadConfig(args.config)
    const ext = config.format === 'json' ? '.json' : '.po'

    mkdirSync(config.compileOutDir, { recursive: true })

    // Collect all catalogs and build union of IDs
    const allCatalogs: Record<string, CatalogData> = {}
    for (const locale of config.locales) {
      const catalogPath = resolve(config.catalogDir, `${locale}${ext}`)
      allCatalogs[locale] = readCatalog(catalogPath, config.format)
    }

    const allIds = collectAllIds(allCatalogs)
    consola.info(`Compiling ${allIds.length} messages across ${config.locales.length} locales`)

    for (const locale of config.locales) {
      const compiled = compileCatalog(
        allCatalogs[locale]!,
        locale,
        allIds,
        config.sourceLocale,
      )
      const outPath = resolve(config.compileOutDir, `${locale}.js`)
      writeFileSync(outPath, compiled, 'utf-8')
      consola.success(`Compiled ${locale} → ${outPath}`)
    }

    // Generate index.js with locale list and lazy loaders
    const indexCode = compileIndex(config.locales, config.compileOutDir)
    const indexPath = resolve(config.compileOutDir, 'index.js')
    writeFileSync(indexPath, indexCode, 'utf-8')
    consola.success(`Generated index → ${indexPath}`)
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

const translate = defineCommand({
  meta: { name: 'translate', description: 'Translate messages using AI (Claude Code or Codex CLI)' },
  args: {
    config: { type: 'string', description: 'Path to config file' },
    provider: { type: 'string', description: 'AI provider: claude or codex', default: 'claude' },
    locale: { type: 'string', description: 'Translate a specific locale only' },
    'batch-size': { type: 'string', description: 'Messages per batch', default: '50' },
  },
  async run({ args }) {
    const config = await loadConfig(args.config)
    const provider = args.provider as AIProvider

    if (provider !== 'claude' && provider !== 'codex') {
      consola.error(`Invalid provider "${provider}". Use "claude" or "codex".`)
      return
    }

    const batchSize = parseInt(args['batch-size'] ?? '50', 10)
    if (isNaN(batchSize) || batchSize < 1) {
      consola.error('Invalid batch-size. Must be a positive integer.')
      return
    }

    const targetLocales = args.locale
      ? [args.locale]
      : config.locales.filter((l: string) => l !== config.sourceLocale)

    if (targetLocales.length === 0) {
      consola.warn('No target locales to translate.')
      return
    }

    consola.info(`Translating with ${provider} (batch size: ${batchSize})`)
    const ext = config.format === 'json' ? '.json' : '.po'

    for (const locale of targetLocales) {
      consola.info(`\n[${locale}]`)
      const catalogPath = resolve(config.catalogDir, `${locale}${ext}`)
      const catalog = readCatalog(catalogPath, config.format)

      const { catalog: updated, translated } = await translateCatalog({
        provider,
        sourceLocale: config.sourceLocale,
        targetLocale: locale,
        catalog,
        batchSize,
      })

      if (translated > 0) {
        writeCatalog(catalogPath, updated, config.format)
        consola.success(`  ${locale}: ${translated} messages translated`)
      } else {
        consola.success(`  ${locale}: already fully translated`)
      }
    }
  },
})

const migrate = defineCommand({
  meta: { name: 'migrate', description: 'Migrate from another i18n library using AI' },
  args: {
    from: { type: 'string', description: 'Source library: vue-i18n, nuxt-i18n, react-i18next, next-intl, next-i18next, lingui', required: true },
    provider: { type: 'string', description: 'AI provider: claude or codex', default: 'claude' },
    write: { type: 'boolean', description: 'Write generated files to disk', default: false },
  },
  async run({ args }) {
    const provider = args.provider as AIProvider
    if (provider !== 'claude' && provider !== 'codex') {
      consola.error(`Invalid provider "${provider}". Use "claude" or "codex".`)
      return
    }

    await runMigrate({
      from: args.from!,
      provider,
      write: args.write ?? false,
    })
  },
})

const main = defineCommand({
  meta: {
    name: 'fluenti',
    version: '0.0.1',
    description: 'Compile-time i18n for modern frameworks',
  },
  subCommands: { extract, compile, stats, translate, migrate },
})

runMain(main)
