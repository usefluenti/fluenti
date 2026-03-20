import { useRoute, useRuntimeConfig } from '#imports'
import type { LocaleDetectContext } from '../../types'
import type { FluentNuxtRuntimeConfig } from '../../types'

/** Detect locale from query parameter (e.g. ?locale=ja) */
export default function detectQuery(ctx: LocaleDetectContext): void {
  try {
    const route = useRoute()
    const config = useRuntimeConfig().public['fluenti'] as FluentNuxtRuntimeConfig
    const paramKey = config.queryParamKey ?? 'locale'
    const queryLocale = route.query[paramKey] as string | undefined
    if (queryLocale && ctx.locales.includes(queryLocale)) {
      ctx.setLocale(queryLocale)
    }
  } catch {
    // May fail outside Nuxt context
  }
}
