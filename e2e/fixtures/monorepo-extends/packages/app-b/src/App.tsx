import { useState } from 'react'
import { useI18n } from '@fluenti/react'

export function App({ onLocaleChange }: { onLocaleChange: (locale: string) => void }) {
  const { t, setLocale } = useI18n()

  const handleSetLocale = async (loc: string) => {
    await setLocale(loc)
    onLocaleChange(loc)
  }

  return (
    <div>
      <div className="locale-switcher">
        <button data-testid="lang-en" onClick={() => handleSetLocale('en')}>English</button>
        <button data-testid="lang-ja" onClick={() => handleSetLocale('ja')}>日本語</button>
      </div>
      <p data-testid="greeting">{t`Hello from App B`}</p>
    </div>
  )
}
