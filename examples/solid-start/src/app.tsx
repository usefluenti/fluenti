import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { Suspense, type Component, type JSX } from 'solid-js'
import { isServer } from 'solid-js/web'
import { I18nProvider, useI18n } from '@fluenti/solid'
import { getSSRLocaleScript } from '@fluenti/core'
import { allMessages, DEFAULT_LOCALE, getInitialLocale } from './lib/i18n'

const LanguageSwitcher: Component = () => {
  const { locale, setLocale } = useI18n()

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
  ] as const

  return (
    <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
      {languages.map((lang) => (
        <button
          onClick={() => {
            document.cookie = `locale=${lang.code};path=/;max-age=31536000`
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
  const { t } = useI18n()
  return (
    <nav style={{ display: 'flex', gap: '16px', 'margin-bottom': '8px' }}>
      <a href="/" style={{ color: '#4a90d9' }}>{t('Home')}</a>
      <a href="/rich-text" style={{ color: '#4a90d9' }}>{t('Rich Text')}</a>
      <a href="/plurals" style={{ color: '#4a90d9' }}>{t('Plurals')}</a>
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

export default function App() {
  const initialLocale = isServer ? DEFAULT_LOCALE : getInitialLocale()

  return (
    <Router
      root={(props) => (
        <I18nProvider
          locale={initialLocale}
          fallbackLocale={DEFAULT_LOCALE}
          messages={allMessages}
        >
          {isServer && <script innerHTML={getSSRLocaleScript(initialLocale).replace(/<\/?script>/g, '')} />}
          <Layout>{props.children}</Layout>
        </I18nProvider>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
