import { inject } from 'vue'
import { FLUENTI_KEY, type FluentiContext } from './plugin'

/**
 * Composable that returns the Fluenti i18n context.
 *
 * Must be called inside a component whose ancestor app has installed the
 * `createFluenti()` plugin.
 *
 * @throws If the plugin has not been installed
 */
export function useI18n(): FluentiContext {
  const ctx = inject(FLUENTI_KEY)
  if (!ctx) {
    throw new Error('[fluenti] useI18n() requires createFluenti plugin')
  }
  return ctx
}
