import { getI18n, setLocale } from '@/lib/i18n.server'

export default async function RSCPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const params = await searchParams

  // Query param overrides cookie-based locale for this page
  if (params.lang) {
    setLocale(params.lang)
  }

  const i18n = await getI18n()

  return (
    <div data-testid="rsc-page">
      <h1 data-testid="rsc-title">{i18n.t('Server rendered')}</h1>
      <p data-testid="rsc-desc">{i18n.t('This page is a React Server Component.')}</p>
      <p data-testid="rsc-locale">{i18n.t('Current server locale: {locale}', { locale: i18n.locale })}</p>
    </div>
  )
}
