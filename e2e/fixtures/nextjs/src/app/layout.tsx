import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getDirection } from '@fluenti/core'
import { I18nClientProvider } from '@/components/I18nClientProvider'
import { Nav } from '@/components/Nav'
import { setLocale } from '@/lib/i18n.server'

export const metadata: Metadata = {
  title: 'Fluenti Next.js',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value ?? 'en'
  const dir = getDirection(locale)

  // Set locale and pre-load messages for RSC pages
  await setLocale(locale)

  return (
    <html lang={locale} dir={dir}>
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '20px' }}>
        <I18nClientProvider locale={locale}>
          <Nav />
          {children}
        </I18nClientProvider>
      </body>
    </html>
  )
}
