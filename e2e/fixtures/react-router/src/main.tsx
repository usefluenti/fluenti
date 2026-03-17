import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { I18nProvider } from '@fluenti/react'
import { getDirection } from '@fluenti/core'
import { useState, useEffect } from 'react'
import en from './locales/compiled/en.js'
import ja from './locales/compiled/ja.js'
import ar from './locales/compiled/ar.js'
import { Layout } from './pages/Layout'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Plurals } from './pages/Plurals'

const messages = { en, ja, ar }

function getInitialLocale(): string {
  const urlParams = new URLSearchParams(window.location.search)
  const queryLang = urlParams.get('lang')
  if (queryLang) {
    document.cookie = `locale=${queryLang};path=/;max-age=31536000`
    return queryLang
  }
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)
  if (match) return decodeURIComponent(match[1])
  return 'en'
}

function Root() {
  const [locale, setLocale] = useState(getInitialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = getDirection(locale)
  }, [locale])

  const handleLocaleChange = (loc: string) => {
    document.cookie = `locale=${loc};path=/;max-age=31536000`
    setLocale(loc)
  }

  return (
    <I18nProvider locale={locale} fallbackLocale="en" messages={messages}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout onLocaleChange={handleLocaleChange} />}>
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
