import { I18nProvider } from '@fluenti/next'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <I18nProvider locale={locale}>
      {children}
    </I18nProvider>
  )
}
