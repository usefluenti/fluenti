import { render } from 'solid-js/web'
import type { Component, JSX } from 'solid-js'
import { createI18n, useI18n, Trans } from '@fluenti/solid'
import en from './locales/compiled/en'
import zhCN from './locales/compiled/zh-CN'
import ja from './locales/compiled/ja'

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
    </div>
  )
}

render(() => <App />, document.getElementById('root')!)
