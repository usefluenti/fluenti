import { useContext } from 'solid-js'
import { I18nCtx } from './provider'
import type { FluentiContext } from './context'

/**
 * Access the i18n context from the nearest `<I18nProvider>`.
 *
 * Throws if no provider is found in the component tree.
 */
export function useI18n(): FluentiContext {
  const ctx = useContext(I18nCtx)
  if (ctx) {
    return ctx
  }

  throw new Error(
    'useI18n() must be used inside an <I18nProvider>.',
  )
}

/** Shorthand hook that returns only the current locale accessor. */
export function useLocale(): () => string {
  return useI18n().locale
}
