import { useRoute } from '#imports'
import type { LocaleDetectContext } from '../../types'

/** Detect locale from query parameter (e.g. ?locale=ja) */
export default function detectQuery(ctx: LocaleDetectContext): void {
  try {
    const route = useRoute()
    const queryLocale = route.query['locale'] as string | undefined
    if (queryLocale && ctx.locales.includes(queryLocale)) {
      ctx.setLocale(queryLocale)
    }
  } catch {
    // May fail outside Nuxt context
  }
}
