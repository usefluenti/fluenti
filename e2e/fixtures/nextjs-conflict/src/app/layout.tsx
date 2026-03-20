import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { I18nProvider } from '@fluenti/next'

export const metadata: Metadata = {
  title: 'Fluenti Next.js Conflict Test',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value ?? 'en'

  return (
    <html lang={locale}>
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '20px' }}>
        <I18nProvider locale={locale}>
          <nav style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <a href="/" data-testid="nav-home">Home</a>
            <a href="/rsc" data-testid="nav-rsc">RSC</a>
          </nav>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
