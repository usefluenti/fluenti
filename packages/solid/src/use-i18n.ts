import { useContext } from 'solid-js'
import { I18nCtx } from './provider'
import { resolveFluentiFallbackContext } from './context'
import type { FluentiContext } from './context'

/**
 * Access the i18n context from the nearest `<I18nProvider>`.
 *
 * Falls back to a global `createFluenti()` singleton when present.
 * In development, returns a no-op fallback context instead of throwing.
 */
export function useI18n(): FluentiContext {
  const ctx = useContext(I18nCtx)
  if (ctx) {
    return ctx
  }

  const fallback = resolveFluentiFallbackContext()
  if (fallback) {
    return fallback.context
  }

  throw new Error(
    'useI18n() must be used inside an <I18nProvider>.',
  )
}

/** Shorthand hook that returns only the current locale accessor. */
export function useLocale(): () => string {
  return useI18n().locale
}
