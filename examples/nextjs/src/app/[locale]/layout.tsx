import { getDirection } from '@fluenti/core'
import { I18nProvider } from '@fluenti/next'
import { Nav } from '@/components/Nav'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div dir={getDirection(locale)}>
      <I18nProvider locale={locale}>
        <Nav />
        {children}
      </I18nProvider>
    </div>
  )
}
