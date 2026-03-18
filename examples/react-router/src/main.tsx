import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { I18nProvider } from '@fluenti/react'
import { getDirection } from '@fluenti/core'
import { useState, useEffect, lazy, Suspense } from 'react'
import en from './locales/compiled/en.js'
import zhCN from './locales/compiled/zh-CN.js'
import ja from './locales/compiled/ja.js'
import { Layout } from './pages/Layout'
import { Home } from './pages/Home'

// Lazy-loaded routes — messages for these pages are tree-shaken
// into separate chunks by the Vite plugin
const Plurals = lazy(() => import('./pages/Plurals').then(m => ({ default: m.Plurals })))
const RichText = lazy(() => import('./pages/RichText').then(m => ({ default: m.RichText })))

const messages = { en, 'zh-CN': zhCN, ja }

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
            <Route path="/plurals" element={
              <Suspense fallback={<p>Loading...</p>}>
                <Plurals />
              </Suspense>
            } />
            <Route path="/richtext" element={
              <Suspense fallback={<p>Loading...</p>}>
                <RichText />
              </Suspense>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
