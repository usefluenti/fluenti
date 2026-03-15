import type { LocaleDetectContext } from '../../types'
import { extractLocaleFromPath } from '../path-utils'

/** Detect locale from URL path prefix (e.g. /ja/about → 'ja') */
export default function detectPath(ctx: LocaleDetectContext): void {
  if (ctx.strategy === 'no_prefix') return
  const { locale } = extractLocaleFromPath(ctx.path, ctx.locales)
  if (locale) {
    ctx.setLocale(locale)
  }
}
