import { createRoot } from 'react-dom/client'
import { I18nProvider } from '@fluenti/react'
import { useState } from 'react'
import en from './locales/compiled/en.js'
import zhCN from './locales/compiled/zh-CN.js'
import ja from './locales/compiled/ja.js'
import ar from './locales/compiled/ar.js'
import { App } from './App'

const messages = { en, 'zh-CN': zhCN, ja, ar }

const cookieLocale = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/)?.[1]

function Root() {
  const [locale, setLocale] = useState(cookieLocale || 'en')

  const handleMissing = (locale: string, id: string) => {
    console.warn(`[fluenti] Missing translation: locale="${locale}" id="${id}"`)
    return undefined
  }

  return (
    <I18nProvider
      locale={locale}
      fallbackLocale="en"
      messages={messages}
      missing={handleMissing}
    >
      <App onLocaleChange={setLocale} />
    </I18nProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
