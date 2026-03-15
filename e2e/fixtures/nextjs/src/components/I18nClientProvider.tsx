'use client'

import type { ReactNode } from 'react'
import { I18nProvider } from '@fluenti/react'
import en from '@/locales/compiled/en'
import ja from '@/locales/compiled/ja'
import ar from '@/locales/compiled/ar'

const allMessages = { en, ja, ar }

export function I18nClientProvider({ locale, children }: { locale: string; children: ReactNode }) {
  return (
    <I18nProvider locale={locale} fallbackLocale="en" messages={allMessages}>
      {children}
    </I18nProvider>
  )
}
