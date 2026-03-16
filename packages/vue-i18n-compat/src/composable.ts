import { inject } from 'vue'
import { BRIDGE_KEY } from './bridge'
import type { BridgeContext } from './types'

/**
 * Unified composable that provides access to the bridge context.
 *
 * Returns a `BridgeContext` with translation methods that check both
 * vue-i18n and fluenti catalogs, locale management that syncs across
 * both libraries, and direct access to each underlying instance.
 *
 * @example
 * ```ts
 * const { t, tc, te, locale, setLocale, fluenti, vueI18n } = useI18n()
 * ```
 */
export function useI18n(): BridgeContext {
  const ctx = inject(BRIDGE_KEY)
  if (!ctx) {
    throw new Error(
      '[@fluenti/vue-i18n-compat] useI18n() requires the bridge plugin to be installed. ' +
      'Call app.use(bridge) where bridge = createFluentBridge({ vueI18n, fluenti }).',
    )
  }
  return ctx
}
