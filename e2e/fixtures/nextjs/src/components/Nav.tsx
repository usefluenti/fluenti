'use client'

import Link from 'next/link'
import { useI18n } from '@fluenti/react'

export function Nav() {
  const { i18n, locale, setLocale } = useI18n()

  return (
    <div>
      <nav style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <Link href="/" data-testid="nav-home">{i18n.t('Home')}</Link>
        <Link href="/about" data-testid="nav-about">{i18n.t('About')}</Link>
        <Link href="/plurals" data-testid="nav-plurals">{i18n.t('Plurals')}</Link>
      </nav>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          data-testid="lang-en"
          style={{ fontWeight: locale === 'en' ? 'bold' : 'normal' }}
          onClick={() => setLocale('en')}
        >English</button>
        <button
          data-testid="lang-ja"
          style={{ fontWeight: locale === 'ja' ? 'bold' : 'normal' }}
          onClick={() => setLocale('ja')}
        >日本語</button>
      </div>
    </div>
  )
}
