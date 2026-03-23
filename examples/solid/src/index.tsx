import { render } from 'solid-js/web'
import { I18nProvider } from '@fluenti/solid'
import { App } from './App'
import en from './locales/compiled/en.js'
import zhCN from './locales/compiled/zh-CN.js'
import ja from './locales/compiled/ja.js'
import ar from './locales/compiled/ar.js'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

const cookieLocale = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/)?.[1]

render(
  () => (
    <I18nProvider
      locale={cookieLocale || 'en'}
      fallbackLocale="en"
      messages={{ en, 'zh-CN': zhCN, ja, ar }}
    >
      <App />
    </I18nProvider>
  ),
  root,
)
