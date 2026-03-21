import type { CatalogData } from './catalog'
import { lintCatalogs } from './lint'
import type { LintDiagnostic } from './lint'

/** Per-locale coverage result */
export interface CheckResult {
  locale: string
  total: number
  translated: number
  missing: number
  fuzzy: number
  coverage: number // 0-100
}

/** Options for the check command */
export interface CheckOptions {
  /** Source locale for comparison */
  sourceLocale: string
  /** Minimum coverage percentage (0-100) */
  minCoverage: number
  /** Check only a specific locale */
  locale?: string
  /** Output format */
  format: 'text' | 'json' | 'github'
}

/** Full check result */
export interface CheckOutput {
  results: CheckResult[]
  passed: boolean
  minCoverage: number
  actualCoverage: number
  diagnostics: LintDiagnostic[]
}

/**
 * Check translation coverage across all locale catalogs.
 */
export function checkCoverage(
  catalogs: Record<string, CatalogData>,
  options: CheckOptions,
): CheckOutput {
  const { sourceLocale, minCoverage, locale: targetLocale } = options
  const sourceCatalog = catalogs[sourceLocale]

  if (!sourceCatalog) {
    return {
      results: [],
      passed: false,
      minCoverage,
      actualCoverage: 0,
      diagnostics: [{
        rule: 'missing-source',
        severity: 'error',
        message: `Source locale catalog "${sourceLocale}" not found`,
      }],
    }
  }

  // Count non-obsolete source entries
  const sourceIds = Object.entries(sourceCatalog)
    .filter(([, entry]) => !entry.obsolete)
    .map(([id]) => id)

  const total = sourceIds.length

  // Determine which locales to check
  const localesToCheck = targetLocale
    ? [targetLocale]
    : Object.keys(catalogs).filter((l) => l !== sourceLocale)

  const results: CheckResult[] = []

  for (const locale of localesToCheck) {
    const catalog = catalogs[locale]
    if (!catalog) {
      results.push({
        locale,
        total,
        translated: 0,
        missing: total,
        fuzzy: 0,
        coverage: 0,
      })
      continue
    }

    let translated = 0
    let missing = 0
    let fuzzy = 0

    for (const id of sourceIds) {
      const entry = catalog[id]
      if (!entry || !entry.translation || entry.translation.length === 0) {
        missing++
      } else {
        translated++
        if (entry.fuzzy) {
          fuzzy++
        }
      }
    }

    const coverage = total > 0 ? (translated / total) * 100 : 100
    results.push({ locale, total, translated, missing, fuzzy, coverage })
  }

  // Calculate overall coverage
  const totalTranslated = results.reduce((sum, r) => sum + r.translated, 0)
  const totalEntries = results.reduce((sum, r) => sum + r.total, 0)
  const actualCoverage = totalEntries > 0
    ? (totalTranslated / totalEntries) * 100
    : 100

  const passed = results.every((r) => r.coverage >= minCoverage)

  // Run lint diagnostics for missing translations
  const lintOpts: Parameters<typeof lintCatalogs>[1] = { sourceLocale }
  if (targetLocale) {
    lintOpts.locales = [sourceLocale, targetLocale]
  }

  const diagnostics = lintCatalogs(catalogs, lintOpts)

  return { results, passed, minCoverage, actualCoverage, diagnostics }
}

/**
 * Format check output as plain text.
 */
export function formatCheckText(output: CheckOutput): string {
  const lines: string[] = []

  for (const r of output.results) {
    const icon = r.coverage >= output.minCoverage ? '✓' : '✗'
    const pct = r.coverage.toFixed(1)
    const details = r.missing > 0 ? ` — ${r.missing} missing` : ''
    const fuzzyNote = r.fuzzy > 0 ? `, ${r.fuzzy} fuzzy` : ''
    lines.push(`${icon} ${r.locale}: ${pct}% (${r.translated}/${r.total})${details}${fuzzyNote}`)
  }

  lines.push('')
  const overallPct = output.actualCoverage.toFixed(1)
  const status = output.passed ? 'PASSED' : 'FAILED'
  lines.push(`Coverage: ${overallPct}% (min: ${output.minCoverage}%) — ${status}`)

  return lines.join('\n')
}

/**
 * Format check output as GitHub Actions annotations.
 */
export function formatCheckGitHub(
  output: CheckOutput,
  catalogDir: string,
  format: 'json' | 'po',
): string {
  const lines: string[] = []
  const ext = format === 'json' ? '.json' : '.po'

  for (const r of output.results) {
    if (r.coverage < output.minCoverage) {
      const file = `${catalogDir}/${r.locale}${ext}`
      lines.push(
        `::error file=${file}::Translation coverage ${r.coverage.toFixed(1)}% below minimum ${output.minCoverage}%`,
      )
    }
  }

  // Add individual missing translation warnings
  const missingDiags = output.diagnostics.filter((d) => d.rule === 'missing-translation')
  for (const d of missingDiags) {
    if (d.locale) {
      const file = `${catalogDir}/${d.locale}${ext}`
      lines.push(`::warning file=${file}::${d.message}`)
    }
  }

  return lines.join('\n')
}

/**
 * Format check output as JSON.
 */
export function formatCheckJson(output: CheckOutput): string {
  return JSON.stringify({
    results: output.results,
    passed: output.passed,
    minCoverage: output.minCoverage,
    actualCoverage: Math.round(output.actualCoverage * 10) / 10,
  }, null, 2)
}
