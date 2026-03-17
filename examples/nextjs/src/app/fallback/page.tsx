'use client'

import { useI18n } from '@fluenti/react'

export default function FallbackPage() {
  const { t, locale } = useI18n()

  return (
    <div data-testid="fallback-page">
      <h2 data-testid="fallback-title">{t`Fallback Demo`}</h2>
      <p data-testid="fallback-locale">Current: {locale}</p>
      <p data-testid="fallback-only-en">{t`This key only exists in English`}</p>
      <p data-testid="fallback-both">{t`Welcome to Fluenti`}</p>
    </div>
  )
}
