import { createSignal } from 'solid-js'
import { Plural, Select, useI18n } from '@fluenti/solid'

export function App() {
  const { t, locale, setLocale, preloadLocale, isLoading } = useI18n()
  const [count] = createSignal(2)
  const [role] = createSignal('admin')

  return (
    <main>
      <div class="locale-switcher">
        <button
          data-testid="lang-en"
          classList={{ active: locale() === 'en' }}
          onMouseEnter={() => preloadLocale('en')}
          onClick={() => setLocale('en')}
        >
          English
        </button>
        <button
          data-testid="lang-ja"
          classList={{ active: locale() === 'ja' }}
          onMouseEnter={() => preloadLocale('ja')}
          onClick={() => setLocale('ja')}
        >
          日本語
        </button>
      </div>

      {isLoading() && <p data-testid="loading">Loading...</p>}

      <p data-testid="switch-label">{t('Switch Language')}</p>
      <h1 data-testid="welcome">{t('Welcome to Fluenti')}</h1>
      <p data-testid="greeting">{t('Hello, {name}!', { name: 'World' })}</p>
      <p data-testid="plural">
        <Plural id="cart-count" value={count()} zero="No items" one="# item" other="# items" />
      </p>
      <p data-testid="select">
        <Select
          id="role-select"
          value={role()}
          options={{ admin: 'Administrator', user: 'User' }}
          other="Guest"
        />
      </p>
    </main>
  )
}
