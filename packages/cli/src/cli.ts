#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'
import consola from 'consola'
import fg from 'fast-glob'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname, extname } from 'node:path'
import { extractFromTsx } from './tsx-extractor'
import { updateCatalog } from './catalog'
import type { CatalogData } from './catalog'
import { readJsonCatalog, writeJsonCatalog } from './json-format'
import { readPoCatalog, writePoCatalog } from './po-format'
import { compileCatalog, compileIndex, collectAllIds, compileTypeDeclaration } from './compile'
import { parallelCompile } from './parallel-compile'
import { formatStatsRow } from './stats-format'
import { lintCatalogs, formatDiagnostics } from './lint'
import { checkCoverage, formatCheckText, formatCheckGitHub, formatCheckJson } from './check'
import { ExtractCache } from './extract-cache'
import { CompileCache } from './compile-cache'
import { translateCatalog } from './translate'
import type { AIProvider } from './translate'
import { runMigrate } from './migrate'
import { runInit } from './init'
import { loadConfig } from './config-loader'
import { createHash } from 'node:crypto'
import type { ExtractedMessage } from '@fluenti/core'
import { resolveLocaleCodes } from '@fluenti/core'

function deriveProjectId(cwd: string): string {
  return createHash('md5').update(cwd).digest('hex').slice(0, 8)
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
      consola.warn(
        `Skipping ${filePath}: install @vue/compiler-sfc to extract from .vue files`,
      )
      return []
    }
  }
  return extractFromTsx(code, filePath)
}

const extract = defineCommand({
  meta: { name: 'extract', description: 'Extract messages from source files' },
  args: {
    config: { type: 'string', description: 'Path to config file' },
    clean: { type: 'boolean', description: 'Remove obsolete entries instead of marking them', default: false },
    'no-fuzzy': { type: 'boolean', description: 'Strip fuzzy flags from all entries', default: false },
    'no-cache': { type: 'boolean', description: 'Disable incremental extraction cache', default: false },
  },
  async run({ args }) {
    const config = await loadConfig(args.config)
    const localeCodes = resolveLocaleCodes(config.locales)
    consola.info(`Extracting messages from ${config.include.join(', ')}`)

    const files = await fg(config.include, { ignore: config.exclude ?? [] })
    const allMessages: ExtractedMessage[] = []
    const useCache = !(args['no-cache'] ?? false)
    const cache = useCache ? new ExtractCache(config.catalogDir, deriveProjectId(process.cwd())) : null

    let cacheHits = 0

    for (const file of files) {
      if (cache) {
        const cached = cache.get(file)
        if (cached) {
          allMessages.push(...cached)
          cacheHits++
          continue
        }
      }

      const code = readFileSync(file, 'utf-8')
      const messages = await extractFromFile(file, code)
      allMessages.push(...messages)

      if (cache) {
        cache.set(file, messages)
      }
    }

    // Prune cache entries for deleted files
    if (cache) {
      cache.prune(new Set(files))
      cache.save()
    }

    if (cacheHits > 0) {
      consola.info(`Found ${allMessages.length} messages in ${files.length} files (${cacheHits} cached)`)
    } else {
      consola.info(`Found ${allMessages.length} messages in ${files.length} files`)
    }

    const ext = config.format === 'json' ? '.json' : '.po'
    const clean = args.clean ?? false
    const stripFuzzy = args['no-fuzzy'] ?? false

    for (const locale of localeCodes) {
      const catalogPath = resolve(config.catalogDir, `${locale}${ext}`)
      const existing = readCatalog(catalogPath, config.format)
      const { catalog, result } = updateCatalog(existing, allMessages, { stripFuzzy })

      const finalCatalog = clean
        ? Object.fromEntries(Object.entries(catalog).filter(([, entry]) => !entry.obsolete))
        : catalog

      writeCatalog(catalogPath, finalCatalog, config.format)

      const obsoleteLabel = clean
        ? `${result.obsolete} removed`
        : `${result.obsolete} obsolete`
      consola.success(
        `${locale}: ${result.added} added, ${result.unchanged} unchanged, ${obsoleteLabel}`,
      )
    }
  },
})

const compile = defineCommand({
  meta: { name: 'compile', description: 'Compile message catalogs to JS modules' },
  args: {
    config: { type: 'string', description: 'Path to config file' },
    'skip-fuzzy': { type: 'boolean', description: 'Exclude fuzzy entries from compilation', default: false },
    'no-cache': { type: 'boolean', description: 'Disable compilation cache', default: false },
    parallel: { type: 'boolean', description: 'Enable parallel compilation using worker threads', default: false },
    concurrency: { type: 'string', description: 'Max number of worker threads (default: auto)' },
  },
  async run({ args }) {
    const config = await loadConfig(args.config)
    const localeCodes = resolveLocaleCodes(config.locales)
    const ext = config.format === 'json' ? '.json' : '.po'

    mkdirSync(config.compileOutDir, { recursive: true })

    // Collect all catalogs and build union of IDs
    const allCatalogs: Record<string, CatalogData> = {}
    const catalogContents: Record<string, string> = {}
    for (const locale of localeCodes) {
      const catalogPath = resolve(config.catalogDir, `${locale}${ext}`)
      if (existsSync(catalogPath)) {
        const content = readFileSync(catalogPath, 'utf-8')
        catalogContents[locale] = content
        allCatalogs[locale] = config.format === 'json'
          ? readJsonCatalog(content)
          : readPoCatalog(content)
      } else {
        catalogContents[locale] = ''
        allCatalogs[locale] = {}
      }
    }

    const allIds = collectAllIds(allCatalogs)
    consola.info(`Compiling ${allIds.length} messages across ${localeCodes.length} locales`)

    const skipFuzzy = args['skip-fuzzy'] ?? false
    const useCache = !(args['no-cache'] ?? false)
    const cache = useCache ? new CompileCache(config.catalogDir, deriveProjectId(process.cwd())) : null
    const useParallel = args.parallel ?? false
    const concurrency = args.concurrency ? parseInt(args.concurrency, 10) : undefined

    if (concurrency !== undefined && (isNaN(concurrency) || concurrency < 1)) {
      consola.error('Invalid --concurrency. Must be a positive integer.')
      process.exitCode = 1
      return
    }

    let skipped = 0
    let needsRegenIndex = false

    // Filter locales that need compilation (cache check)
    const localesToCompile: string[] = []
    for (const locale of localeCodes) {
      if (cache && cache.isUpToDate(locale, catalogContents[locale]!)) {
        const outPath = resolve(config.compileOutDir, `${locale}.js`)
        if (existsSync(outPath)) {
          skipped++
          continue
        }
      }
      localesToCompile.push(locale)
    }

    if (localesToCompile.length > 0) {
      needsRegenIndex = true
    }

    if (useParallel && localesToCompile.length > 1) {
      // Parallel compilation via worker threads
      const tasks = localesToCompile.map((locale) => ({
        locale,
        catalog: allCatalogs[locale]!,
        allIds,
        sourceLocale: config.sourceLocale,
        options: { skipFuzzy },
      }))

      const results = await parallelCompile(tasks, concurrency)

      for (const result of results) {
        const outPath = resolve(config.compileOutDir, `${result.locale}.js`)
        writeFileSync(outPath, result.code, 'utf-8')

        if (cache) {
          cache.set(result.locale, catalogContents[result.locale]!)
        }

        if (result.stats.missing.length > 0) {
          consola.warn(
            `${result.locale}: ${result.stats.compiled} compiled, ${result.stats.missing.length} missing translations`,
          )
          for (const id of result.stats.missing) {
            consola.warn(`  ⤷ ${id}`)
          }
        } else {
          consola.success(`Compiled ${result.locale}: ${result.stats.compiled} messages → ${outPath}`)
        }
      }
    } else {
      // Serial compilation
      for (const locale of localesToCompile) {
        const { code, stats } = compileCatalog(
          allCatalogs[locale]!,
          locale,
          allIds,
          config.sourceLocale,
          { skipFuzzy },
        )
        const outPath = resolve(config.compileOutDir, `${locale}.js`)
        writeFileSync(outPath, code, 'utf-8')

        if (cache) {
          cache.set(locale, catalogContents[locale]!)
        }

        if (stats.missing.length > 0) {
          consola.warn(
            `${locale}: ${stats.compiled} compiled, ${stats.missing.length} missing translations`,
          )
          for (const id of stats.missing) {
            consola.warn(`  ⤷ ${id}`)
          }
        } else {
          consola.success(`Compiled ${locale}: ${stats.compiled} messages → ${outPath}`)
        }
      }
    }

    if (skipped > 0) {
      consola.info(`${skipped} locale(s) unchanged — skipped`)
    }

    if (cache) {
      cache.save()
    }

    // Generate index.js and types when any locale changed or outputs don't exist
    const indexPath = resolve(config.compileOutDir, 'index.js')
    const typesPath = resolve(config.compileOutDir, 'messages.d.ts')

    if (needsRegenIndex || !existsSync(indexPath)) {
      const indexCode = compileIndex(localeCodes, config.compileOutDir)
      writeFileSync(indexPath, indexCode, 'utf-8')
      consola.success(`Generated index → ${indexPath}`)
    }

    if (needsRegenIndex || !existsSync(typesPath)) {
      const typesCode = compileTypeDeclaration(allIds, allCatalogs, config.sourceLocale)
      writeFileSync(typesPath, typesCode, 'utf-8')
      consola.success(`Generated types → ${typesPath}`)
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
    const localeCodes = resolveLocaleCodes(config.locales)
    const ext = config.format === 'json' ? '.json' : '.po'

    const rows: Array<{ locale: string; total: number; translated: number; pct: string }> = []

    for (const locale of localeCodes) {
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
    consola.log('  ────────┼───────┼────────────┼─────────────────────────────')
    for (const row of rows) {
      consola.log(formatStatsRow(row.locale, row.total, row.translated))
    }
    consola.log('')
  },
})

const lint = defineCommand({
  meta: { name: 'lint', description: 'Check translation quality (missing, inconsistent placeholders, fuzzy)' },
  args: {
    config: { type: 'string', description: 'Path to config file' },
    strict: { type: 'boolean', description: 'Treat warnings as errors', default: false },
    locale: { type: 'string', description: 'Lint a specific locale only' },
  },
  async run({ args }) {
    const config = await loadConfig(args.config)
    const localeCodes = resolveLocaleCodes(config.locales)
    const ext = config.format === 'json' ? '.json' : '.po'

    const allCatalogs: Record<string, CatalogData> = {}
    for (const locale of localeCodes) {
      const catalogPath = resolve(config.catalogDir, `${locale}${ext}`)
      allCatalogs[locale] = readCatalog(catalogPath, config.format)
    }

    const targetLocales = args.locale
      ? [args.locale]
      : undefined

    consola.info(`Linting ${targetLocales ? targetLocales.join(', ') : 'all locales'} (source: ${config.sourceLocale})`)

    const lintOpts: Parameters<typeof lintCatalogs>[1] = {
      sourceLocale: config.sourceLocale,
      strict: args.strict ?? false,
    }
    if (targetLocales) lintOpts.locales = targetLocales
    const diagnostics = lintCatalogs(allCatalogs, lintOpts)

    consola.log('')
    consola.log(formatDiagnostics(diagnostics))
    consola.log('')

    const errors = diagnostics.filter((d) => d.severity === 'error')
    const warnings = diagnostics.filter((d) => d.severity === 'warning')

    if (errors.length > 0) {
      process.exitCode = 1
    } else if (args.strict && warnings.length > 0) {
      process.exitCode = 1
    }
  },
})

const check = defineCommand({
  meta: { name: 'check', description: 'Check translation coverage for CI' },
  args: {
    config: { type: 'string', description: 'Path to config file' },
    ci: { type: 'boolean', description: 'Alias for --format github', default: false },
    'min-coverage': { type: 'string', description: 'Minimum coverage percentage (0-100)', default: '100' },
    format: { type: 'string', description: 'Output format: text | json | github' },
    locale: { type: 'string', description: 'Check a specific locale only' },
  },
  async run({ args }) {
    const config = await loadConfig(args.config)
    const localeCodes = resolveLocaleCodes(config.locales)
    const ext = config.format === 'json' ? '.json' : '.po'

    const allCatalogs: Record<string, CatalogData> = {}
    for (const locale of localeCodes) {
      const catalogPath = resolve(config.catalogDir, `${locale}${ext}`)
      allCatalogs[locale] = readCatalog(catalogPath, config.format)
    }

    const minCoverage = parseFloat(args['min-coverage'] ?? '100')
    if (isNaN(minCoverage) || minCoverage < 0 || minCoverage > 100) {
      consola.error('Invalid --min-coverage. Must be a number between 0 and 100.')
      process.exitCode = 1
      return
    }

    const outputFormat = args.format ?? (args.ci ? 'github' : 'text')

    const checkOpts: Parameters<typeof checkCoverage>[1] = {
      sourceLocale: config.sourceLocale,
      minCoverage,
      format: outputFormat as 'text' | 'json' | 'github',
    }
    if (args.locale) checkOpts.locale = args.locale

    const output = checkCoverage(allCatalogs, checkOpts)

    switch (outputFormat) {
      case 'json':
        consola.log(formatCheckJson(output))
        break
      case 'github':
        consola.log(formatCheckGitHub(output, config.catalogDir, config.format))
        break
      default:
        consola.log('')
        consola.log(formatCheckText(output))
        consola.log('')
        break
    }

    if (!output.passed) {
      process.exitCode = 1
    }
  },
})

const translate = defineCommand({
  meta: { name: 'translate', description: 'Translate messages using AI (Claude Code or Codex CLI)' },
  args: {
    config: { type: 'string', description: 'Path to config file' },
    provider: { type: 'string', description: 'AI provider: claude or codex', default: 'claude' },
    locale: { type: 'string', description: 'Translate a specific locale only' },
    'batch-size': { type: 'string', description: 'Messages per batch', default: '50' },
    'dry-run': { type: 'boolean', description: 'Preview translation results without writing files', default: false },
    context: { type: 'string', description: 'Project context description to improve translation quality' },
  },
  async run({ args }) {
    const config = await loadConfig(args.config)
    const localeCodes = resolveLocaleCodes(config.locales)
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
      : localeCodes.filter((l: string) => l !== config.sourceLocale)

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

      if (args['dry-run']) {
        const untranslated = Object.entries(catalog).filter(
          ([, entry]) => !entry.obsolete && (!entry.translation || entry.translation.length === 0),
        )
        if (untranslated.length > 0) {
          for (const [id, entry] of untranslated) {
            consola.log(`  ${id}: ${entry.message ?? id}`)
          }
          consola.success(`  ${locale}: ${untranslated.length} messages would be translated (dry-run)`)
        } else {
          consola.success(`  ${locale}: already fully translated`)
        }
        continue
      }

      const { catalog: updated, translated } = await translateCatalog({
        provider,
        sourceLocale: config.sourceLocale,
        targetLocale: locale,
        catalog,
        batchSize,
        ...(args.context ? { context: args.context } : {}),
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

const init = defineCommand({
  meta: { name: 'init', description: 'Initialize Fluenti in your project' },
  args: {},
  async run() {
    await runInit({ cwd: process.cwd() })
  },
})

const main = defineCommand({
  meta: {
    name: 'fluenti',
    version: '0.0.1',
    description: 'Compile-time i18n for modern frameworks',
  },
  subCommands: { init, extract, compile, stats, lint, check, translate, migrate },
})

runMain(main)
