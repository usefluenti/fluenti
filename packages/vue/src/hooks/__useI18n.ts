import { useI18n } from '../use-i18n'
import type { FluentVueContext } from '../plugin'

/**
 * Internal hook used by the Vite plugin's compiled output.
 * Returns the i18n context for direct t() calls.
 *
 * **Not part of the public API.** Users never write this — the Vite plugin
 * generates imports of this hook automatically.
 *
 * @internal
 */
export function __useI18n(): FluentVueContext {
  return useI18n()
}
