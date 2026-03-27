import { useEffect, useMemo } from 'react'
import { I18nContext } from './context'
import type { FluentiProviderProps, FluentiContext } from './types'
import type { FluentiInstance } from './create-fluenti'
import { createFluenti } from './create-fluenti'
import { setGlobalI18n } from './global-registry'

/**
 * Internal provider that uses a pre-created `FluentiInstance`.
 */
function InstanceProvider({ instance, children }: { instance: FluentiInstance; children: React.ReactNode }) {
  const ctx: FluentiContext = useMemo(
    () => ({
      t: instance.t,
      d: instance.d,
      n: instance.n,
      format: instance.format,
      loadMessages: instance.loadMessages,
      getLocales: instance.getLocales,
      locale: instance.locale,
      setLocale: instance.setLocale,
      isLoading: instance.isLoading,
      loadedLocales: instance.loadedLocales,
      preloadLocale: instance.preloadLocale,
      te: instance.te,
      tm: instance.tm,
      // Internal: used by __useI18n hook and compiled components — not part of public API
      i18n: instance.i18n,
    }) as FluentiContext,
    [instance],
  )

  return <I18nContext.Provider value={ctx}>{children}</I18nContext.Provider>
}

/**
 * Provides the Fluenti i18n context to the React component tree.
 *
 * Accepts either a `locale` + `messages` pair for inline configuration,
 * or a pre-created `instance` from `createFluenti()`.
 *
 * @example
 * ```tsx
 * import { I18nProvider, useI18n } from '@fluenti/react'
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
 *
 * @example Using a pre-created instance
 * ```tsx
 * import { I18nProvider, createFluenti } from '@fluenti/react'
 * import messages from './locales/compiled/en.js'
 *
 * const i18n = createFluenti({ locale: 'en', messages: { en: messages } })
 *
 * function App() {
 *   return (
 *     <I18nProvider instance={i18n}>
 *       <Content />
 *     </I18nProvider>
 *   )
 * }
 * ```
 */
export function I18nProvider(props: FluentiProviderProps) {
  if (props.instance) {
    return <InstanceProvider instance={props.instance}>{props.children}</InstanceProvider>
  }

  return <InlineProvider {...props} />
}

/**
 * Inline provider that delegates to `createFluenti()` for state management.
 */
function InlineProvider({
  locale,
  fallbackLocale,
  messages,
  loadMessages,
  fallbackChain,
  dateFormats,
  numberFormats,
  missing,
  diagnostics,
  interpolate,
  children,
}: FluentiProviderProps) {
  const instance = createFluenti({
    locale: locale ?? 'en',
    messages,
    loadMessages,
    fallbackLocale,
    fallbackChain,
    dateFormats,
    numberFormats,
    missing,
    diagnostics,
    interpolate,
  })

  // Set global i18n instance for webpack loader / vite plugin access
  useEffect(() => {
    setGlobalI18n(instance.i18n)
  }, [instance.i18n])

  return <InstanceProvider instance={instance}>{children}</InstanceProvider>
}
