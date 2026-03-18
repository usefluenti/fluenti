import { createContext } from 'solid-js'
import type { ParentComponent } from 'solid-js'
import { createI18nContext } from './context'
import type { I18nConfig, I18nContext } from './context'

/** Solid context object for i18n — used internally by useI18n() */
export const I18nCtx = createContext<I18nContext>()

/**
 * Provide i18n context to the component tree.
 *
 */
export const I18nProvider: ParentComponent<I18nConfig> = (props) => {
  const ctx = createI18nContext(props)
  return <I18nCtx.Provider value={ctx}>{props.children}</I18nCtx.Provider>
}
