/**
 * Parse Accept-Language header and find the best matching locale.
 * Shared between server handler and client-side header detector.
 */
export function parseAcceptLanguage(header: string, locales: string[]): string | null {
  const entries = header
    .split(',')
    .map((part) => {
      const [lang = '', q = ''] = part.trim().split(';q=')
      const parsed = q ? parseFloat(q) : 1.0
      const quality = Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0
      return { lang: lang!.trim().toLowerCase(), quality }
    })
    .filter((e) => e.quality > 0)
    .sort((a, b) => b.quality - a.quality)

  for (const { lang } of entries) {
    // Exact match (case-insensitive)
    const exact = locales.find((l) => l.toLowerCase() === lang)
    if (exact) return exact

    // Prefix match (e.g., 'en' matches 'en-US', or 'en-US' matches 'en')
    const prefix = lang.split('-')[0]!
    const match = locales.find((l) => {
      const ll = l.toLowerCase()
      return ll === prefix || ll.startsWith(prefix + '-')
    })
    if (match) return match
  }

  return null
}
