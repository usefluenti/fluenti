import { render } from 'solid-js/web'
import { createSignal, type Component, type JSX } from 'solid-js'
import { createI18n, useI18n, Trans, Plural, Select, DateTime, NumberFormat } from '@fluenti/solid'
import en from './locales/compiled/en.js'
import zhCN from './locales/compiled/zh-CN.js'
import ja from './locales/compiled/ja.js'

const DEMO_DATE = new Date(Date.UTC(2025, 0, 15, 12))

createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN,
    ja,
  },
})

const Bold: Component<{ children?: JSX.Element }> = (props) => (
  <strong>{props.children}</strong>
)

const Italic: Component<{ children?: JSX.Element }> = (props) => (
  <em>{props.children}</em>
)

const Link: Component<{ children?: JSX.Element }> = (props) => (
  <a href="#">{props.children}</a>
)

const richComponents = { bold: Bold, italic: Italic, link: Link }

const App: Component = () => {
  const { t, locale, setLocale } = useI18n()
  const [count, setCount] = createSignal(0)
  const [role, setRole] = createSignal('admin')

  return (
    <div>
      <div class="locale-switcher">
        <button data-testid="lang-en" onClick={() => setLocale('en')}>English</button>
        <button data-testid="lang-ja" onClick={() => setLocale('ja')}>日本語</button>
        <button data-testid="lang-zh" onClick={() => setLocale('zh-CN')}>中文</button>
      </div>

      <p data-testid="welcome">{t`Welcome to Fluenti`}</p>

      <p data-testid="trans-welcome">
        <Trans
          message={t('Welcome to <bold>Fluenti</bold> for <italic>SolidJS</italic>!')}
          components={richComponents}
        />
      </p>
      <p data-testid="trans-features">
        <Trans
          message={t('Supports <bold>bold</bold>, <italic>italic</italic>, and <link>links</link>.')}
          components={richComponents}
        />
      </p>

      <p data-testid="plural-basic">
        <Plural id="cart-count" value={count()} zero="No items" one="# item" other="# items" />
      </p>
      <div>
        <button data-testid="count-add" onClick={() => setCount((value) => value + 1)}>Add</button>
        <button data-testid="count-reset" onClick={() => setCount(0)}>Reset</button>
      </div>

      <p data-testid="select-basic">
        <Select
          id="role-select"
          value={role()}
          options={{ admin: 'Administrator', user: 'User' }}
          other="Guest"
        />
      </p>
      <div>
        <button data-testid="role-admin" onClick={() => setRole('admin')}>Admin</button>
        <button data-testid="role-user" onClick={() => setRole('user')}>User</button>
        <button data-testid="role-other" onClick={() => setRole('other')}>Other</button>
      </div>

      <p data-testid="date-basic">
        <DateTime value={DEMO_DATE} />
      </p>
      <p data-testid="number-basic">
        <NumberFormat value={1234.5} style="currency" />
      </p>
    </div>
  )
}

render(() => <App />, document.getElementById('root')!)
