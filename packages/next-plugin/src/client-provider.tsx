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
 * Client-side I18nProvider wrapper for Next.js App Router.
 *
 * Wraps `@fluenti/react`'s `I18nProvider` with the `'use client'` directive,
 * enabling hydration of client components in a Server Component tree.
 * Re-exported as `I18nProvider` from `@fluenti/next/provider`.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { I18nProvider } from '@fluenti/next/provider'
 * import en from '../locales/compiled/en.js'
 *
 * export default function RootLayout({ children }: { children: React.ReactNode }) {
 *   return (
 *     <html>
 *       <body>
 *         <I18nProvider
 *           locale="en"
 *           fallbackLocale="en"
 *           messages={{ en }}
 *         >
 *           {children}
 *         </I18nProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
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
