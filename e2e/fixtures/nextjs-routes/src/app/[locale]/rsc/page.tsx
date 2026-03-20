import type { Metadata } from 'next'
import { t } from '@fluenti/react'
import { getI18n } from '@fluenti/next'

export function generateMetadata(): Metadata {
  return {
    title: t`Server rendered`,
    description: t`This page is a React Server Component.`,
  }
}

export default async function RSCPage() {
  const i18n = await getI18n()
  const locale = i18n.locale

  return (
    <div data-testid="rsc-page">
      <h2 data-testid="rsc-title">{t`Server rendered`}</h2>
      <p data-testid="rsc-desc">{t`This page is a React Server Component.`}</p>
      <p data-testid="rsc-locale">{t`Current server locale: ${locale}`}</p>
    </div>
  )
}
