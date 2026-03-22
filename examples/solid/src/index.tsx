import { render } from 'solid-js/web'
import { I18nProvider } from '@fluenti/solid'
import { App } from './App'
import en from './locales/compiled/en.js'
import zhCN from './locales/compiled/zh-CN.js'
import ja from './locales/compiled/ja.js'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

render(
  () => (
    <I18nProvider
      locale="en"
      fallbackLocale="en"
      messages={{ en, 'zh-CN': zhCN, ja }}
    >
      <App />
    </I18nProvider>
  ),
  root,
)
