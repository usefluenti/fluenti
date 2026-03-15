import type { Metadata } from 'next'
import { I18nClientProvider } from '@/components/I18nClientProvider'
import { Nav } from '@/components/Nav'

export const metadata: Metadata = {
  title: 'Fluenti Next.js',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '20px' }}>
        <I18nClientProvider>
          <Nav />
          {children}
        </I18nClientProvider>
      </body>
    </html>
  )
}
