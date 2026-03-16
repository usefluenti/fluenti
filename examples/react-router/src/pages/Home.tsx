import { useI18n, msg } from '@fluenti/react'

const ROLES = {
  admin: msg`Administrator`,
  user: msg`Regular User`,
}

export function Home() {
  const { i18n, locale } = useI18n()
  const name = 'World'
  const count = 3
  return (
    <section data-testid="home-section">
      <h2 data-testid="welcome">{t`Welcome to Fluenti`}</h2>
      <p data-testid="subtitle">{t`A modern i18n library for React`}</p>
      <p data-testid="greeting">{t`Hello, ${name}!`}</p>
      <p data-testid="items">{t`You have ${count} items in your cart.`}</p>
      <p data-testid="current-locale">{t`Current locale: ${locale}`}</p>
      <p data-testid="date">{i18n.d(new Date(2025, 0, 15))}</p>
      <p data-testid="number">{i18n.n(1234.5)}</p>

      <div data-testid="msg-roles">
        <span data-testid="msg-admin">{i18n.t(ROLES.admin)}</span>
        {' / '}
        <span data-testid="msg-user">{i18n.t(ROLES.user)}</span>
      </div>
      <p data-testid="fallback-only">{t`This key only exists in English`}</p>

      <h3 data-testid="features-title">{t`Features`}</h3>
      <ul data-testid="features-list">
        <li>{t`Reactive locale switching`}</li>
        <li>{t`Rich text with React components`}</li>
        <li>{t`Built-in plural support`}</li>
        <li>{t`Type-safe message catalogs`}</li>
      </ul>
    </section>
  )
}
