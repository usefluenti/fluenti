import { useI18n } from '../use-i18n'
import type { I18nContext } from '../types'

/**
 * Internal hook used by the Vite plugin's compiled output.
 * Returns the i18n context for direct t() calls.
 *
 * **Not part of the public API.** Users never write this — the Vite plugin
 * generates imports of this hook automatically.
 *
 * @internal
 */
export function __useI18n(): I18nContext {
  return useI18n()
}
