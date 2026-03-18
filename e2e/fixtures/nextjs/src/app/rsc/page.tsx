import { t } from '@fluenti/react'
import * as serverI18n from '@fluenti/next/__generated'
import { getI18n } from '@fluenti/next/__generated'
import { withLocale } from '@fluenti/next/server'

async function RSCContent() {
  const i18n = await getI18n()

  return (
    <div data-testid="rsc-page">
      <h1 data-testid="rsc-title">{t`Server rendered`}</h1>
      <p data-testid="rsc-desc">{t`This page is a React Server Component.`}</p>
      <p data-testid="rsc-locale">{t`Current server locale: ${i18n.locale}`}</p>
    </div>
  )
}

export default async function RSCPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const params = await searchParams

  if (params.lang) {
    return withLocale(params.lang, () => RSCContent(), serverI18n)
  }

  return RSCContent()
}
