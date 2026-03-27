import { inject } from 'vue'
import { FLUENTI_KEY, type FluentiContext } from './plugin'

/**
 * Composable that returns the Fluenti i18n context.
 *
 * Must be called inside a component whose ancestor app has installed the
 * `createFluenti()` plugin.
 *
 * @throws If the plugin has not been installed
 *
 * @example
 * ```vue
 * <template>
 *   <!-- Preferred: v-t directive (compile-time, zero runtime cost) -->
 *   <h1 v-t>Welcome to our app</h1>
 *   <p v-t>Hello, {name}!</p>
 *
 *   <!-- Alternative: tagged template in script -->
 *   <p>{{ greeting }}</p>
 * </template>
 *
 * <script setup>
 * import { useI18n } from '@fluenti/vue'
 * const { t, locale, setLocale } = useI18n()
 * const greeting = t`Hello, {name}!`
 * </script>
 * ```
 */
export function useI18n(): FluentiContext {
  const ctx = inject(FLUENTI_KEY)
  if (!ctx) {
    throw new Error('[fluenti] useI18n() requires createFluenti plugin')
  }
  return ctx
}
