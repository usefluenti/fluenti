'use client'

import { useI18n } from '@fluenti/react'

export default function FallbackPage() {
  const { locale } = useI18n()

  return (
    <div data-testid="fallback-page">
      <h1 data-testid="fallback-title">{t`Fallback Demo`}</h1>
      <p data-testid="fallback-locale">Current: {locale}</p>
      {/* This key only has a translation in English, not in Japanese */}
      <p data-testid="fallback-only-en">{t`This text is only translated in English`}</p>
      {/* This key has translations in both en and ja */}
      <p data-testid="fallback-both">{t`Welcome to Fluenti`}</p>
    </div>
  )
}
