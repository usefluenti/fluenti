import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getDirection } from '@fluenti/core'
import { I18nProvider } from '@fluenti/next'
import { Nav } from '@/components/Nav'

export const metadata: Metadata = {
  title: 'Fluenti Next.js Playground',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value ?? 'en'
  const dir = getDirection(locale)

  return (
    <html lang={locale} dir={dir}>
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '20px' }}>
        <I18nProvider locale={locale}>
          <Nav />
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
