'use client'

import { t, useI18n } from '@fluenti/react'

export default function Home() {
  const { locale } = useI18n()
  const name = 'World'

  return (
    <div data-testid="home-page">
      <h2 data-testid="welcome">{t`Welcome to Fluenti`}</h2>
      <p data-testid="home-desc">{t`This is the home page.`}</p>
      <p data-testid="greeting">{t`Hello, ${name}!`}</p>
      <p data-testid="current-locale">{t`Current locale: ${locale}`}</p>
    </div>
  )
}
