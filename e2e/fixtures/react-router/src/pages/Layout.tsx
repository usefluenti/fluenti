import { Outlet, Link } from 'react-router-dom'
import { t, useI18n } from '@fluenti/react'

export function Layout({ onLocaleChange }: { onLocaleChange: (l: string) => void }) {
  const { locale, setLocale } = useI18n()

  const handleSwitch = async (loc: string) => {
    await setLocale(loc)
    onLocaleChange(loc)
  }

  return (
    <div>
      <nav>
        <Link to="/" data-testid="nav-home">{t`Home`}</Link>
        <Link to="/about" data-testid="nav-about">{t`About`}</Link>
        <Link to="/plurals" data-testid="nav-plurals">{t`Plurals`}</Link>
      </nav>

      <div className="locale-switcher">
        <button
          data-testid="lang-en"
          className={locale === 'en' ? 'active' : ''}
          onClick={() => handleSwitch('en')}
        >English</button>
        <button
          data-testid="lang-ja"
          className={locale === 'ja' ? 'active' : ''}
          onClick={() => handleSwitch('ja')}
        >日本語</button>
        <button
          data-testid="lang-ar"
          className={locale === 'ar' ? 'active' : ''}
          onClick={() => handleSwitch('ar')}
        >العربية</button>
      </div>

      <Outlet />
    </div>
  )
}
