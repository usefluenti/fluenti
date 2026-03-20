import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { I18nProvider } from '@fluenti/next'

export const metadata: Metadata = {
  title: 'Multi-Layout Test',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value ?? 'en'

  return (
    <html lang={locale}>
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '20px' }}>
        <I18nProvider locale={locale}>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
