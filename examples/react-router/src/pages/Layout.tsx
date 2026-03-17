import { Outlet, Link } from 'react-router-dom'
import { useI18n } from '@fluenti/react'

export function Layout({ onLocaleChange }: { onLocaleChange: (l: string) => void }) {
  const { t, locale, setLocale, preloadLocale } = useI18n()

  const handleSwitch = async (loc: string) => {
    await setLocale(loc)
    onLocaleChange(loc)
  }

  return (
    <div>
      <header>
        <h1 data-testid="title">{t`Fluenti React Router Playground`}</h1>
        <p data-testid="tagline">{t`Write text. Fluenti translates it. Zero config.`}</p>
      </header>

      <nav>
        <Link to="/" data-testid="nav-home">{t`Home`}</Link>
        <Link to="/plurals" data-testid="nav-plurals">{t`Plurals`}</Link>
        <Link to="/richtext" data-testid="nav-richtext">{t`Rich Text`}</Link>
      </nav>

      <div className="locale-switcher">
        <button
          data-testid="lang-en"
          className={locale === 'en' ? 'active' : ''}
          onClick={() => handleSwitch('en')}
        >English</button>
        <button
          data-testid="lang-zh"
          className={locale === 'zh-CN' ? 'active' : ''}
          onMouseEnter={() => preloadLocale('zh-CN')}
          onClick={() => handleSwitch('zh-CN')}
        >中文</button>
        <button
          data-testid="lang-ja"
          className={locale === 'ja' ? 'active' : ''}
          onMouseEnter={() => preloadLocale('ja')}
          onClick={() => handleSwitch('ja')}
        >日本語</button>
      </div>

      <Outlet />

      <footer data-testid="footer">
        <p>{t`Built with Fluenti and React Router`}</p>
      </footer>
    </div>
  )
}
