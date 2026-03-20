'use client'

import { useI18n } from '@fluenti/react'

export default function SettingsPage() {
  const { t, locale } = useI18n()

  return (
    <div data-testid="page-settings">
      <h1 data-testid="settings-title">{t`Settings`}</h1>
      <span data-testid="current-locale">{locale}</span>
    </div>
  )
}
