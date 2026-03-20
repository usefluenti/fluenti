'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { t, useI18n } from '@fluenti/react'

export function Nav() {
  const { locale, setLocale, preloadLocale } = useI18n()
  const router = useRouter()
  const pathname = usePathname()

  /** Extract the path after the locale prefix: /en/plurals → /plurals */
  const pathWithoutLocale = pathname.replace(/^\/[^/]+/, '') || '/'

  const switchLocale = async (loc: string) => {
    document.cookie = `locale=${loc};path=/;max-age=31536000`
    await setLocale(loc)
    router.push(`/${loc}${pathWithoutLocale}`)
  }

  return (
    <div>
      <header style={{ marginBottom: '16px' }}>
        <h1 data-testid="title">{t`Fluenti Next.js Playground`}</h1>
        <p data-testid="tagline">{t`Write text. Fluenti translates it. Zero config.`}</p>
      </header>

      <nav style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <Link href={`/${locale}`} data-testid="nav-home">{t`Home`}</Link>
        <Link href={`/${locale}/plurals`} data-testid="nav-plurals">{t`Plurals`}</Link>
        <Link href={`/${locale}/richtext`} data-testid="nav-richtext">{t`Rich Text`}</Link>
        <Link href={`/${locale}/rsc`} data-testid="nav-rsc">{t`RSC`}</Link>
        <Link href={`/${locale}/rsc-richtext`} data-testid="nav-rsc-richtext">{t`RSC Rich Text`}</Link>
        <Link href={`/${locale}/streaming`} data-testid="nav-streaming">{t`Streaming`}</Link>
        <Link href={`/${locale}/server-action`} data-testid="nav-actions">{t`Actions`}</Link>
        <Link href={`/${locale}/fallback`} data-testid="nav-fallback">{t`Fallback`}</Link>
      </nav>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          data-testid="lang-en"
          style={{ fontWeight: locale === 'en' ? 'bold' : 'normal', padding: '4px 12px', cursor: 'pointer' }}
          onClick={() => switchLocale('en')}
        >English</button>
        <button
          data-testid="lang-zh"
          style={{ fontWeight: locale === 'zh-CN' ? 'bold' : 'normal', padding: '4px 12px', cursor: 'pointer' }}
          onMouseEnter={() => preloadLocale('zh-CN')}
          onClick={() => switchLocale('zh-CN')}
        >中文</button>
        <button
          data-testid="lang-ja"
          style={{ fontWeight: locale === 'ja' ? 'bold' : 'normal', padding: '4px 12px', cursor: 'pointer' }}
          onMouseEnter={() => preloadLocale('ja')}
          onClick={() => switchLocale('ja')}
        >日本語</button>
      </div>
    </div>
  )
}
