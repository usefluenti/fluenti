'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@fluenti/react'

export function Nav() {
  const { locale, setLocale } = useI18n()
  const router = useRouter()

  const switchLocale = async (loc: string) => {
    document.cookie = `locale=${loc};path=/;max-age=31536000`
    await setLocale(loc)
    router.refresh()
  }

  return (
    <div>
      <nav style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <Link href="/" data-testid="nav-home">{t`Home`}</Link>
        <Link href="/about" data-testid="nav-about">{t`About`}</Link>
        <Link href="/plurals" data-testid="nav-plurals">{t`Plurals`}</Link>
        <Link href="/rsc" data-testid="nav-rsc">{t`RSC`}</Link>
        <Link href="/metadata" data-testid="nav-metadata">{t`Metadata`}</Link>
        <Link href="/streaming" data-testid="nav-streaming">{t`Streaming`}</Link>
        <Link href="/server-action" data-testid="nav-actions">{t`Actions`}</Link>
        <Link href="/richtext" data-testid="nav-richtext">{t`Rich Text`}</Link>
        <Link href="/rsc-richtext" data-testid="nav-rsc-richtext">{t`RSC Rich Text`}</Link>
        <Link href="/fallback" data-testid="nav-fallback">{t`Fallback`}</Link>
      </nav>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          data-testid="lang-en"
          style={{ fontWeight: locale === 'en' ? 'bold' : 'normal' }}
          onClick={() => switchLocale('en')}
        >English</button>
        <button
          data-testid="lang-ja"
          style={{ fontWeight: locale === 'ja' ? 'bold' : 'normal' }}
          onClick={() => switchLocale('ja')}
        >日本語</button>
        <button
          data-testid="lang-ar"
          style={{ fontWeight: locale === 'ar' ? 'bold' : 'normal' }}
          onClick={() => switchLocale('ar')}
        >العربية</button>
      </div>
    </div>
  )
}
