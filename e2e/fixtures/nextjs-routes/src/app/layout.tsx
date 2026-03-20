import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fluenti Next.js Routes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '20px' }}>
        {children}
      </body>
    </html>
  )
}
