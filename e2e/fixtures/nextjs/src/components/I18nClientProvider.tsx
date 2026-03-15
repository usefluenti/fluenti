'use client'

import type { ReactNode } from 'react'
import { I18nProvider } from '@fluenti/react'
import en from '@/locales/compiled/en'
import ja from '@/locales/compiled/ja'

const allMessages = { en, ja }

export function I18nClientProvider({ children }: { children: ReactNode }) {
  return (
    <I18nProvider locale="en" fallbackLocale="en" messages={allMessages}>
      {children}
    </I18nProvider>
  )
}
