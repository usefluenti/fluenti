import type { Metadata } from 'next'
import { t } from '@fluenti/react'

// generateMetadata uses the locale already set by I18nProvider in the layout
export function generateMetadata(): Metadata {
  return {
    title: t`Server rendered`,
    description: t`This page is a React Server Component.`,
  }
}

// No need to call setLocale() or getI18n() here — the layout's I18nProvider
// already initializes the React.cache-scoped i18n instance. Just use t``.
export default async function RSCPage() {
  return (
    <div data-testid="rsc-page">
      <h2 data-testid="rsc-title">{t`Server rendered`}</h2>
      <p data-testid="rsc-desc">{t`This page is a React Server Component.`}</p>
    </div>
  )
}
