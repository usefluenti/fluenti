import { render } from 'solid-js/web'
import { I18nProvider } from '@fluenti/solid'
import en from './locales/compiled/en.js'
import { App } from './App'

function loadLocaleMessages(locale: string) {
  if (locale === 'en') {
    return Promise.resolve(en)
  }
  if (locale === 'ja') {
    return import('./locales/compiled/ja.js')
  }
  return Promise.reject(new Error(`Unsupported locale: ${locale}`))
}

render(
  () => (
    <I18nProvider
      locale="en"
      fallbackLocale="en"
      messages={{ en }}
      lazyLocaleLoading
      chunkLoader={loadLocaleMessages}
    >
      <App />
    </I18nProvider>
  ),
  document.getElementById('root')!,
)
