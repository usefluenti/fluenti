import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { useState } from 'react'
import { I18nProvider, useI18n } from '@fluenti/react'
import { getDirection } from '@fluenti/core'
import type { ReactNode } from 'react'
import en from '../locales/compiled/en'
import zhCN from '../locales/compiled/zh-CN'
import ja from '../locales/compiled/ja'

const messages = { en, 'zh-CN': zhCN, ja }

function getInitialLocale(): string {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)
  if (match) return decodeURIComponent(match[1])
  return 'en'
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Fluenti TanStack Start Playground' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  const [locale, setLocaleState] = useState(getInitialLocale)

  const handleLocaleChange = (loc: string) => {
    document.cookie = `locale=${loc};path=/;max-age=31536000`
    document.documentElement.lang = loc
    document.documentElement.dir = getDirection(loc)
    setLocaleState(loc)
  }

  return (
    <RootDocument locale={locale}>
      <I18nProvider locale={locale} fallbackLocale="en" messages={messages}>
        <AppShell onLocaleChange={handleLocaleChange} />
      </I18nProvider>
    </RootDocument>
  )
}

function RootDocument({ locale, children }: { locale: string; children: ReactNode }) {
  return (
    <html lang={locale} dir={getDirection(locale)}>
      <head>
        <HeadContent />
        <style dangerouslySetInnerHTML={{ __html: `
          body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
          nav { display: flex; gap: 16px; margin-bottom: 20px; }
          nav a { text-decoration: none; color: #0969da; }
          nav a:hover { text-decoration: underline; }
          .locale-switcher { display: flex; gap: 8px; margin-bottom: 20px; }
          .locale-switcher button { padding: 4px 12px; cursor: pointer; }
          .locale-switcher button.active { font-weight: bold; background: #0969da; color: white; border: none; border-radius: 4px; }
          section { margin-bottom: 24px; }
          h2 { border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        `}} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function AppShell({ onLocaleChange }: { onLocaleChange: (l: string) => void }) {
  const { t, i18n, locale, setLocale, preloadLocale } = useI18n()

  const handleSwitch = async (loc: string) => {
    await setLocale(loc)
    onLocaleChange(loc)
  }

  return (
    <>
      <header>
        <h1 data-testid="title">{t`Fluenti TanStack Start Playground`}</h1>
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
        <p>{t`Built with Fluenti and TanStack Start`}</p>
      </footer>
    </>
  )
}
