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

  return (
    <div data-testid="rsc-page">
      <h1 data-testid="rsc-title">{t`Server rendered`}</h1>
      <p data-testid="rsc-desc">{t`This page is a React Server Component.`}</p>
      <p data-testid="rsc-locale">{i18n.t('Current server locale: {locale}', { locale: i18n.locale })}</p>
    </div>
  )
}
