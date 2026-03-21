import { useRequestHeaders } from '#imports'
import type { LocaleDetectContext } from '../../types'

/** Detect locale from Accept-Language header (SSR only) */
export default function detectHeader(ctx: LocaleDetectContext): void {
  if (!ctx.isServer) return

  // Prefer pre-read header from plugin (hoisted before await)
  const acceptLang = ctx.acceptLanguage ?? readAcceptLanguage()
  if (acceptLang) {
    const matched = negotiateLocale(acceptLang, ctx.locales)
    if (matched) {
      ctx.setLocale(matched)
    }
  }
}

function readAcceptLanguage(): string | undefined {
  try {
    const headers = useRequestHeaders(['accept-language'])
    return headers['accept-language']
  } catch {
    return undefined
  }
}

function negotiateLocale(acceptLanguage: string, locales: string[]): string | null {
  const preferred = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=')
      return { lang: lang!.trim().toLowerCase(), q: q ? parseFloat(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)

  for (const { lang } of preferred) {
    if (locales.includes(lang)) return lang
    const prefix = lang.split('-')[0]!
    if (locales.includes(prefix)) return prefix
  }

  return null
}
