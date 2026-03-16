import { useContext } from 'react'
import { I18nContext } from '../context'
import type { I18nContextValue } from '../types'

/**
 * Primary hook for accessing i18n functions.
 *
 * Returns locale, setLocale, isLoading, loadedLocales, preloadLocale,
 * and the underlying i18n instance with t(), d(), n() methods.
 *
 * @throws If used outside of `<I18nProvider>`
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error(
      '[fluenti] useI18n() must be used within an <I18nProvider>. ' +
        'Wrap your app with <I18nProvider> to provide i18n context.',
    )
  }
  return ctx
}
