'use client'

import { useI18n } from '@fluenti/react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { t, locale, setLocale } = useI18n()
  const router = useRouter()
  const name = 'World'

  const switchLocale = async (loc: string) => {
    document.cookie = `locale=${loc};path=/;max-age=31536000`
    await setLocale(loc)
    router.refresh()
  }

  return (
    <div data-testid="home-page">
      <h1 data-testid="welcome">{t`Welcome to Fluenti`}</h1>
      <p data-testid="greeting">{t`Hello, ${name}!`}</p>
      <p data-testid="current-locale">{locale}</p>

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button data-testid="lang-en" onClick={() => switchLocale('en')}>English</button>
        <button data-testid="lang-ja" onClick={() => switchLocale('ja')}>日本語</button>
      </div>
    </div>
  )
}
