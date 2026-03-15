import { inject } from 'vue'
import { FLUENTI_KEY, type FluentVueContext } from './plugin'

/**
 * Composable that returns the Fluenti i18n context.
 *
 * Must be called inside a component whose ancestor app has installed the
 * `createFluentVue()` plugin.
 *
 * @throws If the plugin has not been installed
 */
export function useI18n(): FluentVueContext {
  const ctx = inject(FLUENTI_KEY)
  if (!ctx) {
    throw new Error('[fluenti] useI18n() requires createFluentVue plugin')
  }
  return ctx
}
