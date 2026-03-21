import type { CatalogData } from './catalog'

/** Severity levels for lint diagnostics */
export type LintSeverity = 'error' | 'warning' | 'info'

/** A single lint diagnostic */
export interface LintDiagnostic {
  /** Lint rule that produced this diagnostic */
  rule: string
  /** Severity level */
  severity: LintSeverity
  /** Human-readable message */
  message: string
  /** Affected message ID */
  messageId?: string
  /** Affected locale */
  locale?: string
}

/** Options for configuring lint behavior */
export interface LintOptions {
  /** Locales to lint (default: all) */
  locales?: string[]
  /** Source locale for comparison */
  sourceLocale: string
  /** Whether to fail on warnings (default: false) */
  strict?: boolean
}

/**
 * Run all lint rules against the provided catalogs.
 *
 * Returns an array of diagnostics. Empty array = all checks passed.
 */
export function lintCatalogs(
  catalogs: Record<string, CatalogData>,
  options: LintOptions,
): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = []
  const { sourceLocale } = options
  const locales = options.locales ?? Object.keys(catalogs)
  const sourceCatalog = catalogs[sourceLocale]

  if (!sourceCatalog) {
    diagnostics.push({
      rule: 'missing-source',
      severity: 'error',
      message: `Source locale catalog "${sourceLocale}" not found`,
    })
    return diagnostics
  }

  // Collect non-obsolete source IDs
  const sourceIds = Object.entries(sourceCatalog)
    .filter(([, entry]) => !entry.obsolete)
    .map(([id]) => id)

  for (const locale of locales) {
    if (locale === sourceLocale) continue
    const catalog = catalogs[locale]
    if (!catalog) {
      diagnostics.push({
        rule: 'missing-locale',
        severity: 'error',
        message: `Catalog for locale "${locale}" not found`,
        locale,
      })
      continue
    }

    for (const id of sourceIds) {
      const sourceEntry = sourceCatalog[id]!
      const targetEntry = catalog[id]

      // Rule: missing-translation
      if (!targetEntry || !targetEntry.translation || targetEntry.translation.length === 0) {
        diagnostics.push({
          rule: 'missing-translation',
          severity: 'error',
          message: `Missing translation for "${id}" in locale "${locale}"`,
          messageId: id,
          locale,
        })
        continue
      }

      // Rule: inconsistent-placeholders
      const sourceMessage = sourceEntry.message ?? id
      const sourcePlaceholders = extractPlaceholders(sourceMessage)
      const targetPlaceholders = extractPlaceholders(targetEntry.translation)

      const missingInTarget = sourcePlaceholders.filter((p) => !targetPlaceholders.includes(p))
      const extraInTarget = targetPlaceholders.filter((p) => !sourcePlaceholders.includes(p))

      if (missingInTarget.length > 0) {
        diagnostics.push({
          rule: 'inconsistent-placeholders',
          severity: 'error',
          message: `Translation for "${id}" in "${locale}" is missing placeholders: ${missingInTarget.map((p) => `{${p}}`).join(', ')}`,
          messageId: id,
          locale,
        })
      }

      if (extraInTarget.length > 0) {
        diagnostics.push({
          rule: 'inconsistent-placeholders',
          severity: 'warning',
          message: `Translation for "${id}" in "${locale}" has extra placeholders: ${extraInTarget.map((p) => `{${p}}`).join(', ')}`,
          messageId: id,
          locale,
        })
      }

      // Rule: fuzzy-translation
      if (targetEntry.fuzzy) {
        diagnostics.push({
          rule: 'fuzzy-translation',
          severity: 'warning',
          message: `Translation for "${id}" in "${locale}" is marked as fuzzy`,
          messageId: id,
          locale,
        })
      }
    }

    // Rule: orphan-translation (target has entries not in source)
    for (const [id, entry] of Object.entries(catalog)) {
      if (entry.obsolete) continue
      if (!sourceCatalog[id] || sourceCatalog[id]!.obsolete) {
        diagnostics.push({
          rule: 'orphan-translation',
          severity: 'warning',
          message: `Translation "${id}" in "${locale}" has no corresponding source message`,
          messageId: id,
          locale,
        })
      }
    }
  }

  // Rule: duplicate-messages (same translation text for different IDs in source)
  const messageToIds = new Map<string, string[]>()
  for (const [id, entry] of Object.entries(sourceCatalog)) {
    if (entry.obsolete) continue
    const msg = entry.message ?? id
    const existing = messageToIds.get(msg)
    if (existing) {
      existing.push(id)
    } else {
      messageToIds.set(msg, [id])
    }
  }
  for (const [msg, ids] of messageToIds) {
    if (ids.length > 1) {
      diagnostics.push({
        rule: 'duplicate-message',
        severity: 'info',
        message: `Duplicate source message "${msg.slice(0, 60)}${msg.length > 60 ? '...' : ''}" used by ${ids.length} entries: ${ids.join(', ')}`,
        locale: sourceLocale,
      })
    }
  }

  return diagnostics
}

/** Extract ICU placeholder names from a message string */
function extractPlaceholders(message: string): string[] {
  const placeholders: string[] = []
  // Match {name}, {name, type}, {name, plural, ...}, etc.
  // but not the option keywords inside plural/select
  const regex = /\{(\w+)(?:\s*,\s*(?:plural|select|selectordinal|number|date|time))?/g
  let match
  while ((match = regex.exec(message)) !== null) {
    const name = match[1]!
    if (!placeholders.includes(name)) {
      placeholders.push(name)
    }
  }
  return placeholders.sort()
}

/**
 * Format lint diagnostics for console output.
 */
export function formatDiagnostics(diagnostics: LintDiagnostic[]): string {
  if (diagnostics.length === 0) return '  ✓ All checks passed'

  const lines: string[] = []
  const grouped = groupBy(diagnostics, (d) => d.rule)

  for (const [rule, items] of Object.entries(grouped)) {
    lines.push(`  ${rule} (${items.length}):`)
    for (const d of items) {
      const icon = d.severity === 'error' ? '✗' : d.severity === 'warning' ? '⚠' : 'ℹ'
      lines.push(`    ${icon} ${d.message}`)
    }
  }

  const errors = diagnostics.filter((d) => d.severity === 'error').length
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length
  const infos = diagnostics.filter((d) => d.severity === 'info').length

  lines.push('')
  lines.push(`  Summary: ${errors} errors, ${warnings} warnings, ${infos} info`)

  return lines.join('\n')
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of items) {
    const k = key(item)
    ;(result[k] ?? (result[k] = [])).push(item)
  }
  return result
}
