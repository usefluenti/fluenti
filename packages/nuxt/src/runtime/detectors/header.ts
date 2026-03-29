import { useRequestHeaders } from '#imports'
import type { LocaleDetectContext } from '../../types'
import { parseAcceptLanguage } from '../utils/parse-accept-language'

/** Detect locale from Accept-Language header (SSR only) */
export default function detectHeader(ctx: LocaleDetectContext): void {
  if (!ctx.isServer) return

  // Prefer pre-read header from plugin (hoisted before await)
  const acceptLang = ctx.acceptLanguage ?? readAcceptLanguage()
  if (acceptLang) {
    const matched = parseAcceptLanguage(acceptLang, ctx.locales)
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
