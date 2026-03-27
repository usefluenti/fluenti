import { createContext } from 'solid-js'
import type { ParentComponent } from 'solid-js'
import { createFluentiContext } from './context'
import type { FluentiConfig, FluentiContext } from './context'

/** Solid context object for i18n — used internally by useI18n() */
export const I18nCtx = createContext<FluentiContext>()

/**
 * Provides the Fluenti i18n context to the Solid component tree.
 *
 * @example
 * ```tsx
 * import { I18nProvider, useI18n } from '@fluenti/solid'
 * import messages from './locales/compiled/en.js'
 *
 * function App() {
 *   return (
 *     <I18nProvider locale="en" messages={{ en: messages }}>
 *       <Content />
 *     </I18nProvider>
 *   )
 * }
 *
 * function Content() {
 *   const { t } = useI18n()
 *   return <h1>{t`Welcome to our app`}</h1>
 * }
 * ```
 */
export const I18nProvider: ParentComponent<FluentiConfig> = (props) => {
  const ctx = createFluentiContext(props)
  return <I18nCtx.Provider value={ctx}>{props.children}</I18nCtx.Provider>
}
