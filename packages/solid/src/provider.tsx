import { createContext } from 'solid-js'
import type { ParentComponent } from 'solid-js'
import { createFluentiContext } from './context'
import type { FluentiConfig, FluentiContext } from './context'

/** Solid context object for i18n — used internally by useI18n() */
export const I18nCtx = createContext<FluentiContext>()

/**
 * Provide i18n context to the component tree.
 *
 */
export const I18nProvider: ParentComponent<FluentiConfig> = (props) => {
  const ctx = createFluentiContext(props)
  return <I18nCtx.Provider value={ctx}>{props.children}</I18nCtx.Provider>
}
