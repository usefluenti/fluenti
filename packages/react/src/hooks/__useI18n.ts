import { useContext } from 'react'
import { I18nContext } from '../context'
import type { FluentInstanceExtended } from '../types'

/**
 * Internal hook used by the Vite plugin's compiled output.
 * Returns the i18n instance for direct t() calls.
 *
 * **Not part of the public API.** Users never write this — the Vite plugin
 * generates imports of this hook automatically.
 *
 * @internal
 */
export function __useI18n(): FluentInstanceExtended {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error(
      '[fluenti] __useI18n() must be used within an <I18nProvider>. ' +
        'This is an internal hook used by the Vite plugin — ensure your app is wrapped with <I18nProvider>.',
    )
  }
  return ctx.i18n
}
