import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { createFluent } from '@fluenti/core'
import type { Messages } from '@fluenti/core'
import { I18nContext } from './context'
import type { I18nProviderProps } from './types'
import { setGlobalI18n } from './global-registry'

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

  // Guard against out-of-order async locale loads (race condition protection)
  const localeRequestRef = useRef(0)

  const i18n = useMemo(() => {
    const config: Parameters<typeof createFluent>[0] = {
      locale: currentLocale,
      messages: loadedMessages,
    }
    if (fallbackLocale !== undefined) config.fallbackLocale = fallbackLocale
    if (fallbackChain !== undefined) config.fallbackChain = fallbackChain
    if (dateFormats !== undefined) config.dateFormats = dateFormats
    if (numberFormats !== undefined) config.numberFormats = numberFormats
    if (missing !== undefined) config.missing = missing
    return createFluent(config)
  }, [currentLocale, loadedMessages, fallbackLocale, fallbackChain, dateFormats, numberFormats, missing])

  // Sync external locale prop changes
  useEffect(() => {
    if (locale !== currentLocale) {
      void handleSetLocale(locale)
    }
    // Intentionally only depend on `locale` — we want to sync when the
    // external prop changes, not when internal state (`currentLocale`,
    // `handleSetLocale`) updates, which would cause infinite re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  const handleSetLocale = useCallback(
    async (newLocale: string) => {
      const requestId = ++localeRequestRef.current

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

        // A newer request has superseded this one — discard stale result
        if (requestId !== localeRequestRef.current) return

        const resolved: Messages =
          typeof msgs === 'object' && msgs !== null && 'default' in msgs
            ? (msgs as { default: Messages }).default
            : (msgs as Messages)
        setLoadedMessages((prev) => ({ ...prev, [newLocale]: resolved }))
        setLoadedLocales((prev) => [...new Set([...prev, newLocale])])
        setCurrentLocale(newLocale)
      } catch (err) {
        // Only log if this request is still the latest
        if (requestId === localeRequestRef.current) {
          console.error(`[fluenti] Failed to load locale "${newLocale}"`, err)
        }
      } finally {
        if (requestId === localeRequestRef.current) {
          setIsLoading(false)
        }
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
      t: i18n.t.bind(i18n),
      d: i18n.d.bind(i18n),
      n: i18n.n.bind(i18n),
      format: i18n.format.bind(i18n),
      loadMessages: i18n.loadMessages.bind(i18n),
      getLocales: i18n.getLocales.bind(i18n),
      locale: currentLocale,
      setLocale: handleSetLocale,
      isLoading,
      loadedLocales,
      preloadLocale,
    }),
    [i18n, currentLocale, handleSetLocale, isLoading, loadedLocales, preloadLocale],
  )

  // Expose i18n instance globally for @fluenti/next webpack loader and
  // @fluenti/vite-plugin. The loader injects `globalThis.__fluenti_i18n.t(...)`
  // into client components, avoiding React module boundary issues in Next.js RSC.
  if (typeof globalThis !== 'undefined') {
    setGlobalI18n(i18n)
  }

  return <I18nContext.Provider value={ctx}>{children}</I18nContext.Provider>
}
