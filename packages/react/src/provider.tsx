import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { createFluent } from '@fluenti/core'
import type { Messages } from '@fluenti/core'
import { I18nContext } from './context'
import type { I18nProviderProps } from './types'

export function I18nProvider({
  locale,
  fallbackLocale,
  messages,
  loadMessages,
  fallbackChain,
  dateFormats,
  numberFormats,
  missing,
  children,
}: I18nProviderProps) {
  const [currentLocale, setCurrentLocale] = useState(locale)
  const [isLoading, setIsLoading] = useState(false)
  const [loadedMessages, setLoadedMessages] = useState<Record<string, Messages>>(
    messages ?? {},
  )
  const [loadedLocales, setLoadedLocales] = useState<string[]>(
    messages ? Object.keys(messages) : [],
  )

  // Use ref to avoid stale closures in callbacks
  const loadedMessagesRef = useRef(loadedMessages)
  loadedMessagesRef.current = loadedMessages

  const i18n = useMemo(
    () =>
      createFluent({
        locale: currentLocale,
        fallbackLocale,
        fallbackChain,
        messages: loadedMessages,
        dateFormats,
        numberFormats,
        missing,
      }),
    [currentLocale, loadedMessages, fallbackLocale, fallbackChain, dateFormats, numberFormats, missing],
  )

  // Sync external locale prop changes
  useEffect(() => {
    if (locale !== currentLocale) {
      void handleSetLocale(locale)
    }
  }, [locale]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetLocale = useCallback(
    async (newLocale: string) => {
      if (loadedMessagesRef.current[newLocale]) {
        setCurrentLocale(newLocale)
        return
      }

      if (!loadMessages) {
        console.warn(
          `[fluenti] No messages for locale "${newLocale}" and no loadMessages function provided`,
        )
        return
      }

      setIsLoading(true)
      try {
        const msgs = await loadMessages(newLocale)
        const resolved: Messages =
          typeof msgs === 'object' && msgs !== null && 'default' in msgs
            ? (msgs as { default: Messages }).default
            : (msgs as Messages)
        setLoadedMessages((prev) => ({ ...prev, [newLocale]: resolved }))
        setLoadedLocales((prev) => [...new Set([...prev, newLocale])])
        setCurrentLocale(newLocale)
      } catch (err) {
        console.error(`[fluenti] Failed to load locale "${newLocale}"`, err)
      } finally {
        setIsLoading(false)
      }
    },
    [loadMessages],
  )

  const preloadLocale = useCallback(
    async (loc: string) => {
      if (loadedMessagesRef.current[loc] || !loadMessages) return
      try {
        const msgs = await loadMessages(loc)
        const resolved: Messages =
          typeof msgs === 'object' && msgs !== null && 'default' in msgs
            ? (msgs as { default: Messages }).default
            : (msgs as Messages)
        setLoadedMessages((prev) => ({ ...prev, [loc]: resolved }))
        setLoadedLocales((prev) => [...new Set([...prev, loc])])
      } catch {
        // Silent fail for preload
      }
    },
    [loadMessages],
  )

  const ctx = useMemo(
    () => ({
      i18n,
      locale: currentLocale,
      setLocale: handleSetLocale,
      isLoading,
      loadedLocales,
      preloadLocale,
    }),
    [i18n, currentLocale, handleSetLocale, isLoading, loadedLocales, preloadLocale],
  )

  return <I18nContext.Provider value={ctx}>{children}</I18nContext.Provider>
}
