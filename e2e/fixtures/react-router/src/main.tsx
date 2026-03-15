import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { I18nProvider } from '@fluenti/react'
import { useState } from 'react'
import en from './locales/compiled/en'
import ja from './locales/compiled/ja'
import { Layout } from './pages/Layout'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Plurals } from './pages/Plurals'

const messages = { en, ja }

function Root() {
  const [locale, setLocale] = useState('en')
  return (
    <I18nProvider locale={locale} fallbackLocale="en" messages={messages}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout onLocaleChange={setLocale} />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/plurals" element={<Plurals />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
