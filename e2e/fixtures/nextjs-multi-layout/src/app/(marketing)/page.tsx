'use client'

import { useI18n } from '@fluenti/react'

export default function HomePage() {
  const { t, locale, setLocale } = useI18n()

  const switchLocale = async (loc: string) => {
    document.cookie = `locale=${loc};path=/;max-age=31536000`
    await setLocale(loc)
    window.location.reload()
  }

  return (
    <div data-testid="page-home">
      <h1 data-testid="page-title">{t`Welcome`}</h1>
      <span data-testid="current-locale">{locale}</span>
      <button data-testid="lang-ja" onClick={() => switchLocale('ja')}>日本語</button>
      <button data-testid="lang-en" onClick={() => switchLocale('en')}>English</button>
    </div>
  )
}
