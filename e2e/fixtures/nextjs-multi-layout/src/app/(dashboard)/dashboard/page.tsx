'use client'

import { useI18n } from '@fluenti/react'

export default function DashboardPage() {
  const { t, locale } = useI18n()

  return (
    <div data-testid="page-dashboard">
      <h1 data-testid="dashboard-title">{t`Dashboard Overview`}</h1>
      <span data-testid="current-locale">{locale}</span>
    </div>
  )
}
