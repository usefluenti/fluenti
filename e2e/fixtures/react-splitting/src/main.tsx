import { createRoot } from 'react-dom/client'
import { I18nProvider } from '@fluenti/react'
import en from './locales/compiled/en'
import App from './App'

function loadLocaleMessages(locale: string) {
  if (locale === 'en') {
    return Promise.resolve(en)
  }
  if (locale === 'ja') {
    return import('./locales/compiled/ja.js')
  }
  return Promise.reject(new Error(`Unsupported locale: ${locale}`))
}

createRoot(document.getElementById('root')!).render(
  <I18nProvider
    locale="en"
    fallbackLocale="en"
    messages={{ en }}
    loadMessages={loadLocaleMessages}
  >
    <App />
  </I18nProvider>,
)
