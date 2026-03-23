import { t, msg, useI18n, DateTime, NumberFormat } from '@fluenti/react'

const PAGE_ROLE = msg`Developer`

export function Home() {
  const { t: translate } = useI18n()
  const name = 'World'
  return (
    <div data-testid="home-page">
      <h1 data-testid="welcome">{t`Welcome to Fluenti`}</h1>
      <p data-testid="home-desc">{t`This is the home page.`}</p>
      <p data-testid="greeting">{t`Hello, ${name}!`}</p>
      <p data-testid="msg-role">{translate(PAGE_ROLE)}</p>
      <p data-testid="fallback-only">{t`This key only exists in English`}</p>
      <p data-testid="date-display"><DateTime value={new Date(2025, 0, 15)} /></p>
      <p data-testid="number-display"><NumberFormat value={1234.56} /></p>
    </div>
  )
}
