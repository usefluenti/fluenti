import { useState } from 'react'
import { useI18n, Trans, Plural, Select, msg } from '@fluenti/react'

// Lazy message descriptors — equivalent to Lingui's defineMessage/msg
const ROLES = {
  admin: msg`Administrator`,
  user: msg`Regular User`,
}

export function App({ onLocaleChange }: { onLocaleChange: (locale: string) => void }) {
  const { i18n, locale, setLocale, isLoading, preloadLocale } = useI18n()
  const [page, setPage] = useState<'home' | 'plurals' | 'richtext'>('home')
  const [count, setCount] = useState(0)
  const [gender, setGender] = useState('other')

  const handleSetLocale = async (loc: string) => {
    await setLocale(loc)
    onLocaleChange(loc)
  }

  return (
    <div id="react-app">
      <header>
        <h1 data-testid="title">{i18n.t('Fluenti React Playground')}</h1>
        <p className="tagline" data-testid="tagline">
          {i18n.t('Write text. Fluenti translates it. Zero config.')}
        </p>
      </header>

      <nav>
        <a href="#" data-testid="nav-home" onClick={(e) => { e.preventDefault(); setPage('home') }}>
          {i18n.t('Home')}
        </a>
        <a href="#" data-testid="nav-plurals" onClick={(e) => { e.preventDefault(); setPage('plurals') }}>
          {i18n.t('Plurals')}
        </a>
        <a href="#" data-testid="nav-richtext" onClick={(e) => { e.preventDefault(); setPage('richtext') }}>
          {i18n.t('Rich Text')}
        </a>
      </nav>

      <div className="locale-switcher">
        <button
          data-testid="lang-en"
          className={locale === 'en' ? 'active' : ''}
          onClick={() => handleSetLocale('en')}
        >English</button>
        <button
          data-testid="lang-zh"
          className={locale === 'zh-CN' ? 'active' : ''}
          onMouseEnter={() => preloadLocale('zh-CN')}
          onClick={() => handleSetLocale('zh-CN')}
        >中文</button>
        <button
          data-testid="lang-ja"
          className={locale === 'ja' ? 'active' : ''}
          onMouseEnter={() => preloadLocale('ja')}
          onClick={() => handleSetLocale('ja')}
        >日本語</button>
      </div>

      {isLoading && <p data-testid="loading">Loading...</p>}

      {page === 'home' && (
        <section data-testid="home-section">
          <h2 data-testid="welcome">{i18n.t('Welcome to Fluenti')}</h2>
          <p data-testid="subtitle">{i18n.t('A modern i18n library for React')}</p>
          <p data-testid="greeting">{i18n.t('Hello, {name}!', { name: 'World' })}</p>
          <p data-testid="items">{i18n.t('You have {count} items in your cart.', { count: 3 })}</p>
          <p data-testid="current-locale">{i18n.t('Current locale: {locale}', { locale })}</p>
          <p data-testid="date">{i18n.d(new Date(2025, 0, 15))}</p>
          <p data-testid="number">{i18n.n(1234.5)}</p>

          <div data-testid="msg-roles">
            <span data-testid="msg-admin">{i18n.t(ROLES.admin)}</span>
            {' / '}
            <span data-testid="msg-user">{i18n.t(ROLES.user)}</span>
          </div>
          <p data-testid="fallback-only">{i18n.t('This key only exists in English')}</p>

          <h3 data-testid="features-title">{i18n.t('Features')}</h3>
          <ul data-testid="features-list">
            <li>{i18n.t('Reactive locale switching')}</li>
            <li>{i18n.t('Rich text with React components')}</li>
            <li>{i18n.t('Built-in plural support')}</li>
            <li>{i18n.t('Type-safe message catalogs')}</li>
          </ul>
        </section>
      )}

      {page === 'plurals' && (
        <section data-testid="plurals-section">
          <h2>Plural Demos</h2>
          <div data-testid="plural-result">
            <Plural
              value={count}
              zero="No messages"
              one="# message"
              other="# messages"
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button data-testid="btn-add" onClick={() => setCount(c => c + 1)}>
              {i18n.t('Add')}
            </button>
            <button data-testid="btn-remove" onClick={() => setCount(c => Math.max(0, c - 1))}>
              {i18n.t('Remove')}
            </button>
            <button data-testid="btn-reset" onClick={() => setCount(0)}>
              {i18n.t('Reset')}
            </button>
          </div>

          <h3>Select Demo</h3>
          <div data-testid="select-result">
            <Select
              value={gender}
              male="He liked your post"
              female="She liked your post"
              other="They liked your post"
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button data-testid="gender-male" onClick={() => setGender('male')}>Male</button>
            <button data-testid="gender-female" onClick={() => setGender('female')}>Female</button>
            <button data-testid="gender-other" onClick={() => setGender('other')}>Other</button>
          </div>
        </section>
      )}

      {page === 'richtext' && (
        <section data-testid="richtext-section">
          <h2>Rich Text Demos</h2>
          <p data-testid="trans-basic">
            <Trans>Read the <a href="/docs">documentation</a> for more info.</Trans>
          </p>
          <p data-testid="trans-bold">
            <Trans>This is <strong>important</strong> information.</Trans>
          </p>
          <p data-testid="trans-multi">
            <Trans>Please <a href="/login">sign in</a> or <strong>register</strong> to continue.</Trans>
          </p>
        </section>
      )}

      <footer data-testid="footer">
        <p>{i18n.t('Built with Fluenti and React')}</p>
      </footer>
    </div>
  )
}
