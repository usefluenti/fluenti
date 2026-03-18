import { t } from '@fluenti/react'
import { setLocale, getI18n } from '@fluenti/next/__generated'

export default async function RSCPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const params = await searchParams

  if (params.lang) {
    setLocale(params.lang)
  }

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
