import { Links, Meta, Outlet, Scripts, ScrollRestoration, Link } from '@remix-run/react'
import { I18nProvider, useI18n } from '@fluenti/react'
import en from './locales/compiled/en'
import ja from './locales/compiled/ja'

const allMessages = { en, ja }

function NavBar() {
  const { i18n, locale, setLocale } = useI18n()

  return (
    <div>
      <nav>
        <Link to="/" data-testid="nav-home">{i18n.t('Home')}</Link>
        {' '}
        <Link to="/about" data-testid="nav-about">{i18n.t('About')}</Link>
        {' '}
        <Link to="/plurals" data-testid="nav-plurals">{i18n.t('Plurals')}</Link>
      </nav>

      <div className="locale-switcher">
        <button
          data-testid="lang-en"
          className={locale === 'en' ? 'active' : ''}
          onClick={() => setLocale('en')}
        >English</button>
        <button
          data-testid="lang-ja"
          className={locale === 'ja' ? 'active' : ''}
          onClick={() => setLocale('ja')}
        >日本語</button>
      </div>

      <Outlet />
    </div>
  )
}

export default function App() {
  return (
    <html lang="en">
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
        <I18nProvider locale="en" fallbackLocale="en" messages={allMessages}>
          <NavBar />
        </I18nProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
