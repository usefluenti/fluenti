import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { Suspense, type Component, type JSX } from 'solid-js'
import { getRequestEvent, isServer } from 'solid-js/web'
import { I18nProvider, useI18n, t } from '@fluenti/solid'
import { interpolate } from '@fluenti/core/internal'
import { getDirection } from '@fluenti/core'
import { allMessages, DEFAULT_LOCALE, detectLocaleFromCookie, getInitialLocale } from './lib/i18n'

const LanguageSwitcher: Component = () => {
  const { locale, setLocale, isLoading, preloadLocale } = useI18n()

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
    { code: 'ar', label: 'العربية' },
  ] as const

  return (
    <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
      {isLoading() && <span data-testid="loading">Loading...</span>}
      {languages.map((lang) => (
        <button
          data-testid={`lang-${lang.code}`}
          onMouseEnter={() => preloadLocale(lang.code)}
          onClick={() => {
            document.cookie = `locale=${lang.code};path=/;max-age=31536000`
            document.documentElement.dir = getDirection(lang.code)
            setLocale(lang.code)
          }}
          style={{
            'font-weight': locale() === lang.code ? 'bold' : 'normal',
            'background': locale() === lang.code ? '#4a90d9' : '#e0e0e0',
            'color': locale() === lang.code ? 'white' : '#333',
            'border': 'none',
            'padding': '6px 12px',
            'border-radius': '4px',
            'cursor': 'pointer',
          }}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}

const Nav: Component = () => {
  return (
    <nav style={{ display: 'flex', gap: '16px', 'margin-bottom': '8px' }}>
      <a href="/" data-testid="nav-home" style={{ color: '#4a90d9' }}>{t`Home`}</a>
      <a href="/rich-text" data-testid="nav-richtext" style={{ color: '#4a90d9' }}>{t`Rich Text`}</a>
      <a href="/plurals" data-testid="nav-plurals" style={{ color: '#4a90d9' }}>{t`Plurals`}</a>
      <a href="/formatting" data-testid="nav-formatting" style={{ color: '#4a90d9' }}>{t`Formatting`}</a>
    </nav>
  )
}

const Layout: Component<{ children?: JSX.Element }> = (props) => {
  return (
    <div style={{
      'max-width': '800px',
      'margin': '0 auto',
      'padding': '24px',
    }}>
      <header style={{
        'display': 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '24px',
        'padding-bottom': '16px',
        'border-bottom': '1px solid #ddd',
      }}>
        <Nav />
        <LanguageSwitcher />
      </header>
      <main>
        <Suspense>{props.children}</Suspense>
      </main>
    </div>
  )
}

function getServerLocale(): string {
  const event = getRequestEvent()
  if (!event) return DEFAULT_LOCALE
  const cookieHeader = event.request.headers.get('cookie')
  return detectLocaleFromCookie(cookieHeader)
}

export default function App() {
  const initialLocale = isServer ? getServerLocale() : getInitialLocale()

  if (!isServer) {
    document.documentElement.dir = getDirection(initialLocale)
  }

  return (
    <Router
      root={(props) => (
        <I18nProvider
          locale={initialLocale}
          fallbackLocale={DEFAULT_LOCALE}
          messages={allMessages}
          interpolate={interpolate}
        >
          <Layout>{props.children}</Layout>
        </I18nProvider>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
