import { Links, Meta, Outlet, Scripts, ScrollRestoration, Link } from '@remix-run/react'
import { I18nProvider, t, useI18n } from '@fluenti/react'
import { getDirection } from '@fluenti/core'
import { useState } from 'react'
import en from './locales/compiled/en.js'
import ja from './locales/compiled/ja.js'
import ar from './locales/compiled/ar.js'

const allMessages = { en, ja, ar }

function getInitialLocale(): string {
  if (typeof document === 'undefined') return 'en'
  const urlParams = new URLSearchParams(window.location.search)
  const queryLang = urlParams.get('lang')
  if (queryLang) {
    document.cookie = `locale=${queryLang};path=/;max-age=31536000`
    return queryLang
  }
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)
  if (match) return decodeURIComponent(match[1])
  return 'en'
}

function NavBar({ onLocaleChange }: { onLocaleChange: (loc: string) => void }) {
  const { locale, setLocale } = useI18n()

  const switchLocale = async (loc: string) => {
    document.cookie = `locale=${loc};path=/;max-age=31536000`
    await setLocale(loc)
    onLocaleChange(loc)
  }

  return (
    <div>
      <nav>
        <Link to="/" data-testid="nav-home">{t`Home`}</Link>
        {' '}
        <Link to="/about" data-testid="nav-about">{t`About`}</Link>
        {' '}
        <Link to="/plurals" data-testid="nav-plurals">{t`Plurals`}</Link>
      </nav>

      <div className="locale-switcher">
        <button
          data-testid="lang-en"
          className={locale === 'en' ? 'active' : ''}
          onClick={() => switchLocale('en')}
        >English</button>
        <button
          data-testid="lang-ja"
          className={locale === 'ja' ? 'active' : ''}
          onClick={() => switchLocale('ja')}
        >日本語</button>
        <button
          data-testid="lang-ar"
          className={locale === 'ar' ? 'active' : ''}
          onClick={() => switchLocale('ar')}
        >العربية</button>
      </div>

      <Outlet />
    </div>
  )
}

export default function App() {
  const [currentLocale, setCurrentLocale] = useState(getInitialLocale)

  return (
    <html lang={currentLocale} dir={getDirection(currentLocale)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <style>{`
          body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
          nav { display: flex; gap: 16px; margin-bottom: 20px; }
          nav a { text-decoration: none; color: #0969da; }
          .locale-switcher { display: flex; gap: 8px; margin-bottom: 20px; }
          .locale-switcher button { padding: 4px 12px; cursor: pointer; }
          .locale-switcher button.active { font-weight: bold; background: #0969da; color: white; border: none; border-radius: 4px; }
        `}</style>
      </head>
      <body>
        <I18nProvider locale={currentLocale} fallbackLocale="en" messages={allMessages}>
          <NavBar onLocaleChange={setCurrentLocale} />
        </I18nProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
