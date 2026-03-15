import { createContext } from 'solid-js'
import type { ParentComponent } from 'solid-js'
import { createI18nContext, setGlobalI18nContext } from './context'
import type { I18nConfig, I18nContext } from './context'

/** Solid context object for i18n — used internally by useI18n() */
export const I18nCtx = createContext<I18nContext>()

/**
 * Provide i18n context to the component tree.
 *
 * Also registers the context as the global singleton so that
 * `useI18n()` works without a provider in child components
 * rendered outside this tree (e.g. portals).
 */
export const I18nProvider: ParentComponent<I18nConfig> = (props) => {
  const ctx = createI18nContext(props)
  setGlobalI18nContext(ctx)
  return <I18nCtx.Provider value={ctx}>{props.children}</I18nCtx.Provider>
}
