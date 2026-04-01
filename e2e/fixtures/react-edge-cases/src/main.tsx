import { createRoot } from 'react-dom/client'
import { I18nProvider } from '@fluenti/react'
import { interpolate } from '@fluenti/core/runtime'
import { useState } from 'react'
import { en, ja, ar } from './messages'
import { App } from './App'

const messages = { en, ja, ar }

function Root() {
  const [locale, setLocale] = useState('en')
  return (
    <I18nProvider
      locale={locale}
      fallbackLocale="en"
      messages={messages}
      interpolate={interpolate}
    >
      <App onLocaleChange={setLocale} />
    </I18nProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
