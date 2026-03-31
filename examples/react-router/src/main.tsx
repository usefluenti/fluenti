import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { I18nProvider } from '@fluenti/react'
import { interpolate } from '@fluenti/react'
import { getDirection } from '@fluenti/core'
import { useState, useEffect, lazy, Suspense } from 'react'
import en from './locales/compiled/en.js'
import zhCN from './locales/compiled/zh-CN.js'
import ja from './locales/compiled/ja.js'
import { Layout } from './pages/Layout'
import { Home } from './pages/Home'
import {
  AVAILABLE_LOCALES,
  getCookieLocale,
  getQueryLocale,
  serializeLocaleCookie,
} from './locale'

// Lazy-loaded routes — messages for these pages are tree-shaken
// into separate chunks by the Vite plugin
const Plurals = lazy(() => import('./pages/Plurals').then(m => ({ default: m.Plurals })))
const RichText = lazy(() => import('./pages/RichText').then(m => ({ default: m.RichText })))

const messages = { en, 'zh-CN': zhCN, ja }

function getInitialLocale(): string {
  const queryLocale = getQueryLocale(window.location.search, AVAILABLE_LOCALES)
  if (queryLocale) {
    document.cookie = serializeLocaleCookie(queryLocale)
    return queryLocale
  }
  return getCookieLocale(document.cookie, AVAILABLE_LOCALES) ?? 'en'
}

function Root() {
  const [locale, setLocale] = useState(getInitialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = getDirection(locale)
  }, [locale])

  const handleLocaleChange = (loc: string) => {
    document.cookie = serializeLocaleCookie(loc)
    setLocale(loc)
  }

  return (
    <I18nProvider locale={locale} fallbackLocale="en" messages={messages} interpolate={interpolate}>
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
