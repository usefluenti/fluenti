const BLOCK_FULL = '█'
const BLOCK_EMPTY = '░'

/**
 * Render a Unicode progress bar.
 *
 * @param pct - Percentage (0–100)
 * @param width - Character width of the bar (default 20)
 */
export function formatProgressBar(pct: number, width = 20): string {
  const clamped = Math.max(0, Math.min(100, pct))
  const filled = Math.round((clamped / 100) * width)
  return BLOCK_FULL.repeat(filled) + BLOCK_EMPTY.repeat(width - filled)
}

/**
 * Wrap a percentage string in ANSI colour based on value.
 *
 * - ≥90 → green  (\x1b[32m)
 * - ≥70 → yellow (\x1b[33m)
 * - <70 → red    (\x1b[31m)
 */
export function colorizePercent(pct: number): string {
  const label = pct.toFixed(1) + '%'
  if (pct >= 90) return `\x1b[32m${label}\x1b[0m`
  if (pct >= 70) return `\x1b[33m${label}\x1b[0m`
  return `\x1b[31m${label}\x1b[0m`
}

/**
 * Format a full stats row for a single locale.
 */
export function formatStatsRow(
  locale: string,
  total: number,
  translated: number,
): string {
  const pct = total > 0 ? (translated / total) * 100 : 0
  const pctDisplay = total > 0 ? colorizePercent(pct) : '—'
  const bar = total > 0 ? formatProgressBar(pct) : ''
  return `  ${locale.padEnd(8)}│ ${String(total).padStart(5)} │ ${String(translated).padStart(10)} │ ${bar} ${pctDisplay}`
}
