import { useContext } from 'solid-js'
import { I18nCtx } from './provider'
import { getGlobalI18nContext } from './context'
import type { I18nContext } from './context'

/**
 * Access the i18n context.
 *
 * Resolution order:
 * 1. Nearest `<I18nProvider>` in the component tree
 * 2. Module-level singleton created by `createI18n()`
 *
 * Throws if neither is available.
 */
export function useI18n(): I18nContext {
  const ctx = useContext(I18nCtx)
  if (ctx) {
    return ctx
  }

  const global = getGlobalI18nContext()
  if (global) {
    return global
  }

  throw new Error(
    'useI18n requires either createI18n() to be called at startup, ' +
    'or the component to be inside an <I18nProvider>.',
  )
}
