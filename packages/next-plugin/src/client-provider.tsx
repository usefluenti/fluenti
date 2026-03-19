'use client'

import type { ReactNode } from 'react'
import { I18nProvider } from '@fluenti/react'
import type { AllMessages, DateFormatOptions, NumberFormatOptions, Locale } from '@fluenti/core'

export interface ClientI18nProviderProps {
  locale: string
  fallbackLocale: string
  messages: AllMessages
  fallbackChain?: Record<string, Locale[]>
  dateFormats?: DateFormatOptions
  numberFormats?: NumberFormatOptions
  children: ReactNode
}

/**
 * Client-side I18nProvider wrapper.
 * Used internally by I18nProvider to hydrate client components.
 */
export function ClientI18nProvider({
  locale,
  fallbackLocale,
  messages,
  fallbackChain,
  dateFormats,
  numberFormats,
  children,
}: ClientI18nProviderProps) {
  return (
    <I18nProvider
      locale={locale}
      fallbackLocale={fallbackLocale}
      messages={messages}
      {...(fallbackChain ? { fallbackChain } : {})}
      {...(dateFormats ? { dateFormats } : {})}
      {...(numberFormats ? { numberFormats } : {})}
    >
      {children}
    </I18nProvider>
  )
}
